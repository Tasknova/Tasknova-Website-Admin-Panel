# API Logging - Quick Start Testing Guide

## Setup

### 1. Apply Database Migration
```bash
# From project root
cd supabase
supabase migration up

# Or if using local development
supabase db push
```

Verify the table was created:
```sql
SELECT * FROM api_logs LIMIT 1;
```

### 2. Restart Your Application
```bash
npm run dev
```

## Testing the Success Message Fix

### Test 1: Add an Input Variable Successfully
1. Navigate to AI Agents → Select an agent
2. Click "Edit Agent Config" or similar
3. Scroll to "Input Variables" section
4. Click "Add Variable"
5. Fill in:
   - Name: `customer_phone`
   - Type: `TEXT`
   - Required: ✓ (checked)
6. Click "Update Config"
7. **Verify:** Success toast appears after a brief moment (not immediately)
8. **Verify:** Variable appears in the list below

### Test 2: Verify the API Call in Logs
After test 1, run:
```bash
curl "http://localhost:3000/api/ai-agents/logs?success=true&limit=1" | jq '.logs[0]'
```

Expected output shows:
```json
{
  "endpoint": "/api/ai-agents/update-agent-config",
  "method": "POST",
  "status_code": 200,
  "success": true,
  "request_body": {
    "agent_id": "xxx",
    "system_prompt": "...",
    "call_infields": [
      {
        "field_name": "customer_phone",
        "field_type": "TEXT",
        "is_visible": true
      }
    ]
  },
  "response_body": {
    "config_saved": true
  }
}
```

### Test 3: Simulate a Database Failure (Debug Only)
This test helps verify error handling works:

1. Temporarily add a bug to the database query (for testing):
   - Open `/src/app/api/ai-agents/update-agent-config/route.ts`
   - Find the line: `.eq('agent_id', agent_id)`
   - Change to: `.eq('agent_id', 'INVALID_ID')`
   - Save the file

2. Repeat Test 1
3. **Verify:** Error toast appears instead of success
4. **Verify:** Response status is 500 in Network tab

5. Check the logs:
```bash
curl "http://localhost:3000/api/ai-agents/logs?success=false&limit=1" | jq '.logs[0]'
```

Should show:
```json
{
  "status_code": 500,
  "success": false,
  "error_message": "...",
  "response_body": {
    "error": "Failed to save agent configuration..."
  }
}
```

6. **IMPORTANT:** Undo the bug by reverting the change

### Test 4: View All Logs for an Agent
```bash
# Get all logs for an agent (replace AGENT_ID)
curl "http://localhost:3000/api/ai-agents/logs?agent_id=AGENT_ID&limit=100" | jq '.logs'
```

### Test 5: Filter Logs by Endpoint
```bash
# Get all logs for update-agent-config endpoint
curl "http://localhost:3000/api/ai-agents/logs?endpoint=/api/ai-agents/update-agent-config&limit=50" | jq '.logs'
```

### Test 6: Clean Up Old Logs
```bash
# Delete logs older than 7 days
curl -X DELETE "http://localhost:3000/api/ai-agents/logs?days_old=7"
```

## Expected Behavior

### When Config Saves Successfully
1. Request sent to `/api/ai-agents/update-agent-config`
2. Server:
   - Updates IndusLabs API
   - Saves to local database
   - Increments version number
   - Logs call with `success: true`, `config_saved: true`
3. Frontend:
   - Receives status 200
   - Checks `response.config_saved === true`
   - Shows success toast
   - Refreshes the agent details

### When Database Save Fails
1. Request sent to `/api/ai-agents/update-agent-config`
2. Server:
   - Updates IndusLabs API ✓
   - Database save fails ✗
   - Logs call with `success: false`, `error_message: "..."`
   - Returns status 500
3. Frontend:
   - Receives status 500
   - Shows error toast with error message
   - Does NOT refresh (failure confirmed)

## Debugging Tips

### Check what was actually saved
```bash
# Get the latest config for an agent
curl "http://localhost:3000/api/ai-agents/logs?endpoint=/api/ai-agents/[id]/config" | jq '.logs[0].response_body.data.call_infields'
```

### See all API calls in sequence
```bash
# Get the last 20 API calls for an agent in chronological order
curl "http://localhost:3000/api/ai-agents/logs?agent_id=AGENT_ID&limit=20&offset=0" | jq '.logs | reverse'
```

### Find failed operations
```bash
# Get all failed API calls
curl "http://localhost:3000/api/ai-agents/logs?success=false&limit=100" | jq '.logs[] | {endpoint, status_code, error_message}'
```

## Common Issues

### Success toast appears but variable not in database
1. Check logs for the update call - is `config_saved: true`?
2. If yes, check database directly:
   ```sql
   SELECT agent_id, call_infields FROM ai_agent_configs 
   WHERE agent_id = 'your_agent_id' 
   ORDER BY updated_at DESC LIMIT 1;
   ```
3. If call_infields is NULL or empty, check the request_body in logs

### Error toast appears with unclear message
1. Query logs for that agent's update call:
   ```bash
   curl "http://localhost:3000/api/ai-agents/logs?agent_id=AGENT_ID&endpoint=/api/ai-agents/update-agent-config&success=false&limit=5"
   ```
2. Look at the `error_message` field for specific details

### No logs appearing in database
1. Verify migration was applied:
   ```sql
   \dt api_logs
   ```
2. Check if logging is working:
   ```bash
   # Try any API call
   curl "http://localhost:3000/api/ai-agents/logs?limit=1"
   ```
3. Check server logs for any errors during logAPICall

## Next Steps

After confirming the fixes work:
1. Run integration tests to verify the flow end-to-end
2. Load test with multiple concurrent updates to ensure logging doesn't impact performance
3. Set up log retention policy (e.g., delete logs > 30 days old)
4. Create monitoring dashboard for API success rates
