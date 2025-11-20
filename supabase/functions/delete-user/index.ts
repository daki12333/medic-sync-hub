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
    // Verify admin authorization
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

    // Extract user ID from JWT token (already verified by verify_jwt=true)
    const token = authHeader.replace('Bearer ', '').trim()
    const base64Url = token.split('.')[1]

    if (!base64Url) {
      console.error('❌ JWT token missing payload segment')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convert from base64url to base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=')
    const payloadJson = atob(base64)
    const payload = JSON.parse(payloadJson)
    const adminUserId = payload.sub as string | undefined
    
    if (!adminUserId) {
      console.error('❌ Could not extract admin user ID from token payload', payload)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create service role client
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Check if caller is admin
    console.log('🔐 Checking admin role for user:', adminUserId)
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: adminUserId,
      _role: 'admin'
    })

    if (roleError) {
      console.error('❌ Error checking admin role:', roleError)
      return new Response(
        JSON.stringify({ error: roleError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!isAdmin) {
      console.error('❌ User is not an admin')
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Admin authorization verified')

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

    console.log('👤 Deleting user and related data for:', user_id)

    // First delete specialist reports where this doctor is referenced
    console.log('🗑️ Deleting specialist reports for doctor:', user_id)
    const { error: reportsError } = await supabaseClient
      .from('specialist_reports')
      .delete()
      .eq('doctor_id', user_id)

    if (reportsError) {
      console.error('❌ Specialist reports delete error:', reportsError)
      return new Response(
        JSON.stringify({ error: reportsError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Then delete the profile record to avoid foreign key constraint violation
    console.log('🗑️ Deleting profile...')
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

    console.log('🧹 Related records cleaned, now deleting auth user...')

    // Now delete the user from auth.users (best-effort; we already cleaned app data)
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(user_id)

    if (authError) {
      console.error('❌ Auth delete error (soft failure, app data already deleted):', authError)
      const anyErr = authError as any

      // If Supabase Auth returns an internal DB error, treat this as a soft delete:
      // all app data is already removed, but auth.users cleanup failed.
      if (anyErr?.status !== 500 || anyErr?.code !== 'unexpected_failure') {
        return new Response(
          JSON.stringify({ error: authError.message || 'Auth delete error' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('⚠️ Auth user could not be hard-deleted, but app data has been cleaned up.')
    }

    console.log('✅ User deleted successfully (app data removed, auth user deleted or ignored)')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User deleted successfully',
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
