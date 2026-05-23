// lib/supabase.js
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

// 1. Chukua keys kutoka Render Env
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('⚠️ SUPABASE_URL au SUPABASE_KEY haipo kwenye .env')
  process.exit(1)
}

// 2. Tengeneza client ya Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)

// 3. Function ya kuvuta settings zote mara bot inawaka
export async function getBotSettings() {
  const { data, error } = await supabase
    .from('b_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    console.log('⚠️ b_settings haijasomwa:', error.message)
    // Rudisha defaults kama table haipo au kuna error
    return {
      botname: 'BUNNY MD',
      owner_number: '255780470905',
      owner_name: 'Lupin Starnley',
      prefix: '!',
      public_mode: false
    }
  }
  return data
}

// 4. Function ya kuwasha Realtime listener kwa settings
export function listenSettingsUpdates(callback) {
  supabase
    .channel('b_settings_changes')
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'b_settings', filter: 'id=eq.1' }, 
      (payload) => {
        console.log('🔥 Settings zimebadilika live:', payload.new)
        callback(payload.new) // Tuma data mpya kwa index.js
      }
    )
    .subscribe()
}