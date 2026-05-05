# Click2Call API Documentation

Base URL:
https://developer.induslabs.io

API Prefix:
/api


--------------------------------------------------
AUTHENTICATION
--------------------------------------------------

POST /api/login

Description:
Authenticate user and receive access and refresh tokens.

Request Body:
{
  "email": "user@example.com",
  "password": "your_password"
}

Response (200):
{
  "status_code": 200,
  "message": "Login successful",
  "data": {
    "access_token": "<jwt_access_token>",
    "refresh_token": "<jwt_refresh_token>",
    "token_type": "bearer"
  }
}

Errors:
400 - Invalid credentials / inactive user
401 - Authentication failure


--------------------------------------------------
CREATE CLICK2CALL
--------------------------------------------------

POST /api/calls/click2call

Description:
Creates an asynchronous click-to-call request.

Headers:
Authorization: Bearer <access_token>

Request Body:
{
  "customer_number": "919999999999",
  "agent_number": "918888888888",
  "did": "919484956750",
  "callback_url": "https://example.com/webhook",
  "transcript": true,
  "transcript_language": "hi"
}

Fields:
customer_number        Required
agent_number           Required
did                    Required for provider flow
callback_url           Optional
transcript             Default false
transcript_language    Optional

Response (200):
{
  "status_code": 200,
  "message": "Click2Call request created",
  "data": {
    "call_id": "call_ab12cd34ef56gh78",
    "status": "queued"
  }
}

Errors:
401 - Unauthorized
422 - Validation error
400 - User-related issues


--------------------------------------------------
GET RECENT CALL LOGS
--------------------------------------------------

GET /api/calls/recent

Description:
Fetch paginated call records.

Headers:
Authorization: Bearer <access_token>

Query Parameters:
status
call_type
transcript_status
customer_number
agent_number
did
date_from (ISO datetime)
date_to (ISO datetime)
limit (1–200)
page (>=1)

Response (200):
{
  "status_code": 200,
  "message": "Recent call logs fetched",
  "data": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "calls": [
      {
        "call_id": "call_ab12cd34ef56gh78",
        "status": "completed",
        "customer_number": "919999999999",
        "agent_number": "918888888888",
        "did": "919484956750",
        "duration": "52",
        "call_type": "C2C",
        "transcript_status": "ready",
        "recording_url": "https://signed-url",
        "transcript": {
          "summary": "Call summary",
          "call_outcome": "Interested"
        },
        "created_at": "2026-04-14T06:50:00Z"
      }
    ]
  }
}


--------------------------------------------------
GET TRANSCRIPT BY CALL ID
--------------------------------------------------

GET /api/calls/{call_id}/transcript

Description:
Fetch transcript status or content.

Headers:
Authorization: Bearer <access_token>

Responses:

Pending:
{
  "data": {
    "transcript_status": "pending",
    "transcript": null
  }
}

Ready:
{
  "data": {
    "transcript_status": "ready",
    "transcript": {
      "summary": "Call summary",
      "call_outcome": "Interested"
    }
  }
}

Failed:
{
  "data": {
    "transcript_status": "failed",
    "transcript": null,
    "error": "Unauthorized transcription API"
  }
}


--------------------------------------------------
WEBHOOKS (CALLBACKS)
--------------------------------------------------

Description:
If callback_url is provided, backend sends POST requests with updates.

Flow:
1. Create call → receive call_id
2. Provider processes call
3. Backend triggers webhook events

Events:
call.completed
call.failed
transcript.ready
transcript.failed
transcript.disabled

Example: Call Completed
{
  "event": "call.completed",
  "data": {
    "call_id": "call_ab12cd34ef56gh78",
    "transcript_status": "processing"
  }
}

Example: Transcript Ready
{
  "event": "transcript.ready",
  "data": {
    "call_id": "call_ab12cd34ef56gh78",
    "transcript": {
      "summary": "Call summary",
      "call_outcome": "Interested"
    }
  }
}


--------------------------------------------------
RECOMMENDED FLOW
--------------------------------------------------

1. Authenticate → get access_token
2. Create click2call → get call_id
3. Use:
   - Webhooks (preferred)
   - OR polling endpoints
4. Fetch transcript when ready


--------------------------------------------------
BEST PRACTICES
--------------------------------------------------

- Store call_id for tracking
- Prefer /recent API over per-call polling
- Handle transcript_status states properly
- Keep tokens secure
- Expect asynchronous processing delays


--------------------------------------------------
QUICK CURL FLOW
--------------------------------------------------

Login:
curl -X POST https://developer.induslabs.io/api/login

Create Call:
curl -X POST https://developer.induslabs.io/api/calls/click2call

Get Logs:
curl -X GET https://developer.induslabs.io/api/calls/recent

Get Transcript:
curl -X GET https://developer.induslabs.io/api/calls/{call_id}/transcript