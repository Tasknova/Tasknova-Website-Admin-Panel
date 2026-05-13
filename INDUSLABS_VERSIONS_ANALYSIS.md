# IndusLabs Agent Versions - What's Being Returned

## ✅ IndusLabs DOES Return Prompt Versions

The `/api/agents/{agentId}/configs` endpoint returns **an array of config versions** with:

### Data Returned Per Version:
```json
{
  "agent_id": "AGT_3FD52A75",
  "system_prompt": "Full system prompt text...",
  "starting_instructions": "Starting instructions...",
  "version": 5,
  "status": "published",      // or "draft"
  "is_current": true,          // marks the active version
  "created_at": "2026-04-22T09:58:53.903000",
  "updated_at": "2026-04-22T09:58:53.943000",
  "_id": "69e89bdd3f3ddf675b010ce9",
  "agent_type": "generic_alpha",
  "guardrail_ids": [...],
  "llm_config": { ... },
  "tts_config": { ... },
  "stt_config": { ... },
  "vad_config": { ... }
}
```

## ✅ Example Response Structure

For agent `AGT_3FD52A75`, IndusLabs returned:
- **Version 5** - Published (CURRENT) - with full Hinglish interviewer prompt
- **Version 4** - Draft - with full prompt
- **Version 3** - Draft - with full prompt  
- **Version 2** - Draft - with full prompt
- **Version 1** - Draft - with basic generic prompt

**Response Size**: ~72KB (because system prompts are very detailed)

## 📍 How Data Flows Now

### Scenario 1: Agent Has Local Data (Preferred)
```
GET /api/ai-agents/[id]/versions
  ↓
Query ai_agent_configs (current config)
Query prompt_versions (historical versions)
  ↓
Return local data with source="local"
```

### Scenario 2: Agent Only In IndusLabs (No Local Data)
```
GET /api/ai-agents/[id]/versions
  ↓
Query local tables → find nothing
  ↓
Call getIndusLabsAgentVersions(id)
  ↓
Fetch from https://developer.induslabs.io/api/agents/{id}/configs
  ↓
Parse response → extract all versions with system_prompt
  ↓
Return IndusLabs data with source="induslabs"
```

## 🎯 Response Format (After Fix)

```json
{
  "agent_id": "AGT_3FD52A75",
  "versions": [
    {
      "version": "current",
      "system_prompt": "Full prompt...",
      "starting_instructions": "Instructions...",
      "status": "active",
      "source": "local",       // or "induslabs"
      "created_at": "2026-04-22T09:58:53.903000"
    },
    ...
  ],
  "total_count": 5,
  "sources": ["induslabs"]    // tracks where data came from
}
```

## 🔧 What Was Fixed

### Before:
- API only returned local DB data
- If agent existed in IndusLabs but not locally → no versions shown
- Missing system prompts

### After:
- API tries local DB first
- Falls back to IndusLabs if no local data
- Returns full system prompts and starting instructions
- Tracks data source for debugging

## ✅ Tests Performed

Called: `GET /api/ai-agents/debug-induslabs-versions?agent_id=AGT_3FD52A75`

**Confirmed:**
- ✅ IndusLabs returns array of versions
- ✅ Each version has `system_prompt` 
- ✅ Each version has `starting_instructions`
- ✅ Returned 5 versions for the agent
- ✅ Status field shows "published" or "draft"
- ✅ `is_current` flag marks active version

## 🎯 Why It Wasn't Working Before

1. Your agents (Process Engineer, industrial engineer, etc.) were created directly in IndusLabs
2. They weren't synced to local Supabase tables (ai_agents, ai_agent_configs, prompt_versions)
3. The old API only looked at local tables
4. → Result: Empty versions list

## ✅ Now Fixed

- New API fetches from IndusLabs automatically when local data is missing
- System prompts and starting instructions are displayed
- All versions with metadata are shown
