import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('🚀 Delete User Edge Function called with method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Creating Supabase client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing environment configuration' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Get the request body
    console.log('📝 Reading request body...')
    const { user_id } = await req.json()
    
    if (!user_id) {
      console.error('❌ Missing user_id')
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('👤 Deleting user:', user_id)

    // First delete the profile record to avoid foreign key constraint violation
    console.log('🗑️ Deleting profile first...')
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('user_id', user_id)

    if (profileError) {
      console.error('❌ Profile delete error:', profileError)
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Profile deleted, cleaning related records...')

    // Delete user roles
    const { error: rolesError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', user_id)

    if (rolesError) {
      console.error('❌ User roles delete error:', rolesError)
      return new Response(
        JSON.stringify({ error: rolesError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Delete calendar permissions where the user is the subject
    const { error: calPermUserError } = await supabaseClient
      .from('calendar_permissions')
      .delete()
      .eq('user_id', user_id)

    if (calPermUserError) {
      console.error('❌ Calendar permissions (user) delete error:', calPermUserError)
      return new Response(
        JSON.stringify({ error: calPermUserError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Delete calendar permissions created by this user (if any)
    const { error: calPermCreatorError } = await supabaseClient
      .from('calendar_permissions')
      .delete()
      .eq('created_by', user_id)

    if (calPermCreatorError) {
      console.error('❌ Calendar permissions (creator) delete error:', calPermCreatorError)
      return new Response(
        JSON.stringify({ error: calPermCreatorError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🧹 Related records cleaned, now deleting auth user...')

    // Now delete the user from auth.users
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(user_id)

    if (authError) {
      console.error('❌ Auth delete error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ User deleted successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User deleted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})