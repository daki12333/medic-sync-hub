import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Edge Function called with method:', req.method)
  console.log('🚀 Request URL:', req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Creating Supabase client...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔧 SUPABASE_URL exists:', !!supabaseUrl)
    console.log('🔧 SERVICE_ROLE_KEY exists:', !!serviceRoleKey)
    
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
    const requestBody = await req.json()
    console.log('📝 Request body:', requestBody)
    
    const { email, password, full_name, role, phone, specialization, license_number } = requestBody

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      console.error('❌ Missing required fields:', { email: !!email, password: !!password, full_name: !!full_name, role: !!role })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('👤 Creating auth user...')
    // Create the user in auth.users
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    })

    if (authError) {
      console.error('❌ Auth error:', authError)
      
      // Check if user already exists
      if (authError.message.includes('already been registered') || authError.message.includes('email_exists')) {
        console.log('⚠️ User already exists, checking if we can update profile...')
        
        // Try to get existing user by email
        const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers()
        
        if (listError) {
          console.error('❌ Error listing users:', listError)
          return new Response(
            JSON.stringify({ error: 'Failed to check existing users' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
        
        const existingUser = existingUsers.users.find(user => user.email === email)
        
        if (existingUser) {
          console.log('✅ Found existing user:', existingUser.id)
          
          // Update or create profile for existing user
          const { error: upsertError } = await supabaseClient
            .from('profiles')
            .upsert({
              user_id: existingUser.id,
              email,
              full_name,
              role,
              phone: phone || null,
              specialization: specialization || null,
              license_number: license_number || null,
            }, {
              onConflict: 'user_id'
            })
          
          if (upsertError) {
            console.error('❌ Profile upsert error:', upsertError)
            return new Response(
              JSON.stringify({ error: upsertError.message }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          console.log('✅ Profile updated for existing user')
          
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'User profile updated successfully',
              user: {
                id: existingUser.id,
                email: existingUser.email
              }
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
      
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Auth user created:', authData.user.id)
    console.log('📋 Creating profile...')

    // Create the profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        email,
        full_name,
        role,
        phone: phone || null,
        specialization: specialization || null,
        license_number: license_number || null,
      })

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      console.log('🧹 Cleaning up auth user...')
      // If profile creation fails, clean up the auth user
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Profile created successfully')
    console.log('🎉 User creation completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Function error:', error)
    console.error('💥 Error stack:', error.stack)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})