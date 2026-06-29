import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://qdeqpgixanmuzonsoeou.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZXFwZ2l4YW5tdXpvbnNvZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk1OTg4OCwiZXhwIjoyMDg2NTM1ODg4fQ.wasTXQC3LAnugyUHESs6xCZ1X0Ft6gt_TnTU_Otz3sE'
)

async function run() {
  console.log('Cleaning up old evaluations...')
  const { data, error } = await supabase
    .from('ai_evaluations')
    .delete()
    .eq('error_message', 'Failed to parse URL from pending')

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Deleted orphaned evaluations!')
  }
}

run()
