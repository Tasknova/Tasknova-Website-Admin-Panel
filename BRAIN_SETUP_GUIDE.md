# Company Brain & Project Brain - Implementation Guide

## 🎯 Overview

This implementation provides a complete **Company Brain** and **Project Brain** system with vector embeddings for semantic search using:

- **Database**: PostgreSQL with pgvector extension (Supabase)
- **Vector Model**: Google Gemini `text-embedding-004` (768 dimensions)
- **Frontend**: React + TypeScript
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Search**: Cosine similarity vector search

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Supabase Project** with access to:
   - Database (PostgreSQL)
   - Storage Buckets
   - Edge Functions
   
2. **Google Gemini API Key**
   - Get it from: https://ai.google.dev/
   - Model: `text-embedding-004` (768 dimensions)

3. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

---

## 🚀 Step-by-Step Setup

### Step 1: Enable pgvector Extension

In your Supabase Dashboard → SQL Editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This enables vector similarity search in PostgreSQL.

---

### Step 2: Run Database Migrations

Apply the migrations in order:

```bash
# Navigate to your project root
cd d:\Tasknova Projects\Tasknova-Admin-Website\Tasknova-Website-Admin-Panel

# Run migrations (if using Supabase CLI)
supabase db push

# OR manually run each migration file in Supabase Dashboard → SQL Editor:
# 1. supabase/migrations/002_create_company_brain_tables.sql
# 2. supabase/migrations/003_create_project_brain_tables.sql
# 3. supabase/migrations/004_create_vector_search_functions.sql
```

This creates:
- 8 tables (company_brain, brain_documents, projects, project_documents, etc.)
- 4 RPC functions for vector search
- Vector indexes for fast similarity search
- Row Level Security policies

---

### Step 3: Create Storage Buckets

In Supabase Dashboard → Storage:

1. **Create bucket: `brain-documents`**
   - Public: Yes (or configure RLS)
   - File size limit: Configure as needed
   - Allowed MIME types: Configure as needed

2. **Create bucket: `project-documents`**
   - Public: Yes (or configure RLS)
   - File size limit: Configure as needed
   - Allowed MIME types: Configure as needed

**Storage Policies** (Optional - for private buckets):

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brain-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brain-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

### Step 4: Configure Environment Variables

#### A. Frontend Environment Variables

Create or update `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Important**: 
- Get `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase Dashboard → Settings → API
- Get `VITE_GEMINI_API_KEY` from Google AI Studio

#### B. Supabase Edge Functions Environment Variables

In Supabase Dashboard → Edge Functions → Settings, add:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

The following are automatically available:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### Step 5: Deploy Edge Functions

Deploy all 4 edge functions:

```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy generate-project-embedding
supabase functions deploy regenerate-embeddings
supabase functions deploy regenerate-project-embeddings
supabase functions deploy match-documents
```

**Alternative**: Use Supabase Dashboard → Edge Functions → Deploy

---

### Step 6: Verify Database Tables

Check that all tables were created:

```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'company_brain',
  'brain_documents',
  'document_groups',
  'company_brain_embeddings',
  'projects',
  'project_metadata',
  'project_documents',
  'project_embeddings'
);
```

You should see 8 tables.

---

### Step 7: Verify RPC Functions

Check that vector search functions were created:

```sql
-- Run in Supabase SQL Editor
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'match_company_brain_documents',
  'match_project_documents',
  'match_company_projects',
  'match_documents'
);
```

You should see 4 functions.

---

### Step 8: Verify Vector Indexes

Check that vector indexes were created:

```sql
-- Run in Supabase SQL Editor
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname IN (
  'company_brain_embeddings_embedding_idx',
  'project_embeddings_embedding_idx'
);
```

You should see 2 indexes.

---

### Step 9: Test the System

#### A. Test Company Brain

1. Navigate to the BrainPage component in your app
2. Fill in company information
3. Click "Save & Generate Embeddings"
4. Upload a test document
5. Go to Search tab and try a query like: "What is our mission?"

#### B. Test Project Brain

1. Create or open a project
2. Navigate to the Project Brain page
3. Fill in project metadata
4. Click "Save Metadata & Generate Embeddings"
5. Upload a project document
6. Go to Search tab and try a query like: "What are the technical requirements?"

---

## 📁 File Structure

```
project-root/
├── supabase/
│   ├── migrations/
│   │   ├── 002_create_company_brain_tables.sql
│   │   ├── 003_create_project_brain_tables.sql
│   │   └── 004_create_vector_search_functions.sql
│   └── functions/
│       ├── generate-project-embedding/
│       │   └── index.ts
│       ├── regenerate-embeddings/
│       │   └── index.ts
│       ├── regenerate-project-embeddings/
│       │   └── index.ts
│       └── match-documents/
│           └── index.ts
├── src/
│   ├── lib/
│   │   ├── embeddings.ts (Company Brain utilities)
│   │   └── projectEmbeddings.ts (Project Brain utilities)
│   ├── types/
│   │   └── index.ts (TypeScript interfaces)
│   └── components/
│       ├── BrainPage.tsx (Company Brain UI)
│       └── ProjectBrainPage.tsx (Project Brain UI)
└── .env.local (Environment variables)
```

---

## 🔑 Key Concepts

### Vector Embeddings
- Convert text to 768-dimensional numerical arrays
- Enable semantic (meaning-based) search
- Generated by Google Gemini API

### Cosine Similarity
- Measures similarity between vectors (0-1 scale)
- 1 = identical, 0 = unrelated
- Used for ranking search results

### Text Chunking
- Breaks large text into smaller pieces (max 1000 chars)
- Each chunk gets its own embedding
- Enables searching through long documents

### Content Types
- **company_info**: Company form data
- **additional_context**: Free-form company notes (chunked)
- **document**: Document metadata
- **project_metadata**: Project form data
- **document_chunk**: Future: extracted document content

---

## 🛠️ Maintenance Tasks

### Regenerate All Company Brain Embeddings

```bash
# Call the Edge Function
curl -X POST \
  https://your-project.supabase.co/functions/v1/regenerate-embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Regenerate All Project Embeddings

```bash
# Call the Edge Function
curl -X POST \
  https://your-project.supabase.co/functions/v1/regenerate-project-embeddings \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Check Embedding Count

```sql
-- Company Brain embeddings
SELECT content_type, COUNT(*) 
FROM company_brain_embeddings 
GROUP BY content_type;

-- Project embeddings
SELECT content_type, COUNT(*) 
FROM project_embeddings 
GROUP BY content_type;
```

---

## 🔍 Troubleshooting

### Issue: No search results

**Possible causes:**
1. No embeddings generated yet
2. Threshold too high (try lowering to 0.70)
3. Query too specific or unrelated

**Solutions:**
```sql
-- Check if embeddings exist
SELECT COUNT(*) FROM company_brain_embeddings;
SELECT COUNT(*) FROM project_embeddings;

-- If 0, regenerate embeddings using Edge Functions
```

---

### Issue: "GEMINI_API_KEY not configured"

**Solution:**
1. Go to Supabase Dashboard → Edge Functions → Settings
2. Add `GEMINI_API_KEY` environment variable
3. Redeploy the edge function

---

### Issue: Vector index not being used

**Solution:**
```sql
-- Check if vector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Recreate index if needed
DROP INDEX IF EXISTS company_brain_embeddings_embedding_idx;
CREATE INDEX company_brain_embeddings_embedding_idx 
ON company_brain_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

### Issue: Storage upload fails

**Solution:**
1. Check bucket exists: `brain-documents` and `project-documents`
2. Check bucket is public or RLS policies are correct
3. Verify file size is within limits

---

## 📊 Monitoring & Analytics

### Check API Usage

Monitor your Google Gemini API usage:
- Go to: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com
- Check quotas and limits

### Database Performance

```sql
-- Index usage stats
SELECT * FROM pg_stat_user_indexes 
WHERE indexrelname IN (
  'company_brain_embeddings_embedding_idx',
  'project_embeddings_embedding_idx'
);

-- Table sizes
SELECT 
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
WHERE relname LIKE '%embedding%';
```

---

## 🔒 Security Best Practices

1. **Never expose Service Role Key** on frontend
2. **Use RLS policies** for all tables
3. **Validate user inputs** before storing
4. **Rate limit** embedding generation
5. **Monitor costs** (Gemini API usage)
6. **Sanitize** user-provided content
7. **Use HTTPS** for all API calls

---

## 📈 Optimization Tips

1. **Batch Processing**: Generate embeddings in batches to reduce API calls
2. **Caching**: Cache frequently searched queries
3. **Index Tuning**: Adjust IVFFlat `lists` parameter based on dataset size:
   - Small (<10k vectors): lists = 100
   - Medium (10k-1M vectors): lists = 1000
   - Large (>1M vectors): Consider HNSW index
4. **Chunk Size**: Experiment with chunk sizes (500-1500 chars)
5. **Threshold**: Tune similarity threshold based on results quality

---

## 📚 Additional Resources

- **pgvector**: https://github.com/pgvector/pgvector
- **Google Gemini API**: https://ai.google.dev/api/embeddings
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Vector Search Basics**: https://www.pinecone.io/learn/vector-database/

---

## ✅ Implementation Checklist

- [ ] Enable pgvector extension
- [ ] Run all database migrations
- [ ] Create storage buckets (brain-documents, project-documents)
- [ ] Configure frontend environment variables (.env.local)
- [ ] Configure Edge Functions environment variables (GEMINI_API_KEY)
- [ ] Deploy all 4 Edge Functions
- [ ] Verify tables created (8 tables)
- [ ] Verify RPC functions created (4 functions)
- [ ] Verify vector indexes created (2 indexes)
- [ ] Test Company Brain (add info, upload doc, search)
- [ ] Test Project Brain (add metadata, upload doc, search)
- [ ] Monitor API usage and costs
- [ ] Set up monitoring and alerts

---

## 🎉 Success Indicators

You'll know the system is working when:

1. ✅ Company info saves successfully
2. ✅ Documents upload without errors
3. ✅ Search returns relevant results with similarity scores
4. ✅ Embeddings table shows records (check with SQL query)
5. ✅ No console errors in browser or Edge Function logs

---

## 🆘 Getting Help

If you encounter issues:

1. Check Supabase Edge Function logs
2. Check browser console for errors
3. Verify environment variables are set
4. Test RPC functions directly in SQL Editor
5. Check pgvector extension is installed

---

**Implementation completed successfully!** 🚀

All files have been created and configured. Follow this guide to deploy the system to your Supabase project.
