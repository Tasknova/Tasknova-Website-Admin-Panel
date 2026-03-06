# Company Brain & Project Brain - Developer Quick Reference

## 📦 Import Utilities

```typescript
// Company Brain utilities
import {
  generateEmbedding,
  prepareCompanyInfoForEmbedding,
  storeCompanyBrainWithEmbedding,
  storeAdditionalContext,
  searchSimilarContent
} from '@/lib/embeddings';

// Project Brain utilities
import {
  prepareProjectMetadataForEmbedding,
  storeProjectMetadataWithEmbedding,
  generateProjectDocumentEmbedding,
  searchProjectContent,
  searchCompanyProjects
} from '@/lib/projectEmbeddings';
```

---

## 🏢 Company Brain Usage

### Save Company Information with Embedding

```typescript
import { supabase } from '@/lib/supabase';
import { storeCompanyBrainWithEmbedding } from '@/lib/embeddings';

const companyData = {
  company_name: 'Acme Corp',
  company_description: 'Leading AI solutions provider',
  industry: 'Technology',
  mission_statement: 'Making AI accessible to everyone',
  vision_statement: 'A world powered by intelligent automation',
  core_values: ['Innovation', 'Integrity', 'Excellence'],
  unique_selling_points: ['24/7 Support', 'AI-Powered', 'Cloud-Native'],
  target_audience: 'Small to medium businesses'
};

const result = await storeCompanyBrainWithEmbedding(
  supabase,
  userId,
  companyData
);

if (result.success) {
  console.log('Company brain saved!', result.brainId);
} else {
  console.error('Error:', result.error);
}
```

### Store Additional Context (with chunking)

```typescript
import { storeAdditionalContext } from '@/lib/embeddings';

const largeText = `
  Our company was founded in 2020 with a vision to revolutionize 
  the AI industry. We've grown from 5 employees to 50+...
  [long text continues]
`;

const result = await storeAdditionalContext(
  supabase,
  userId,
  brainId,
  largeText
);

console.log(`Generated ${result.chunksProcessed} chunks`);
```

### Upload and Embed Document

```typescript
// Upload file to storage
const file = event.target.files[0];
const fileName = `${Date.now()}_${file.name}`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('brain-documents')
  .upload(`${userId}/${fileName}`, file);

if (uploadError) throw uploadError;

// Get public URL
const { data: urlData } = supabase.storage
  .from('brain-documents')
  .getPublicUrl(uploadData.path);

// Insert document record
const { data: docData, error: docError } = await supabase
  .from('brain_documents')
  .insert({
    user_id: userId,
    file_name: file.name,
    file_type: 'pdf',
    file_size: file.size,
    mime_type: file.type,
    storage_path: uploadData.path,
    storage_url: urlData.publicUrl,
    status: 'uploaded'
  })
  .select()
  .single();

// Generate embedding
import { generateEmbedding } from '@/lib/embeddings';

const content = `File: ${file.name}\nType: pdf\nDescription: Product specs`;
const embeddingResult = await generateEmbedding(content);

if (!embeddingResult.error) {
  await supabase
    .from('company_brain_embeddings')
    .insert({
      user_id: userId,
      content_type: 'document',
      content_id: docData.id,
      content: content,
      embedding: embeddingResult.embedding,
      metadata: {
        file_name: file.name,
        file_type: 'pdf'
      }
    });
}
```

### Search Company Knowledge

```typescript
import { searchSimilarContent } from '@/lib/embeddings';

const results = await searchSimilarContent(
  supabase,
  userId,
  'What is our pricing model?',
  0.78, // similarity threshold
  10    // max results
);

results.forEach(result => {
  console.log(`Match: ${(result.similarity * 100).toFixed(1)}%`);
  console.log(`Type: ${result.content_type}`);
  console.log(`Content: ${result.content}`);
  console.log(`Metadata:`, result.metadata);
});
```

---

## 📂 Project Brain Usage

### Save Project Metadata with Embedding

```typescript
import { storeProjectMetadataWithEmbedding } from '@/lib/projectEmbeddings';

const metadata = {
  domain: 'Healthcare',
  industry: 'Medical Technology',
  project_type: 'Web Application',
  target_audience: 'Healthcare professionals',
  tech_stack: ['React', 'Node.js', 'PostgreSQL'],
  key_goals: ['HIPAA compliance', 'Real-time updates', 'Mobile-friendly'],
  requirements: 'System must handle 10,000 concurrent users...',
  budget_range: '$100k-$150k',
  priority_level: 'high',
  pricing_information: 'SaaS model with tiered pricing...',
  additional_context: 'Project targeting US hospitals...'
};

const result = await storeProjectMetadataWithEmbedding(
  supabase,
  projectId,
  companyId,
  'HealthCare Portal',
  metadata
);

if (result.success) {
  console.log('Metadata saved!', result.metadataId);
}
```

### Generate Document Embedding (using Edge Function)

```typescript
import { generateProjectDocumentEmbedding } from '@/lib/projectEmbeddings';

// After uploading document to storage and creating record
const result = await generateProjectDocumentEmbedding(
  supabase,
  projectId,
  companyId,
  documentId
);

if (result.success) {
  console.log('Document embedding generated!');
}
```

### Search Project Content

```typescript
import { searchProjectContent } from '@/lib/projectEmbeddings';

const results = await searchProjectContent(
  supabase,
  projectId,
  'What are the technical requirements?',
  0.75, // similarity threshold
  10    // max results
);

results.forEach(result => {
  console.log(`Match: ${(result.similarity * 100).toFixed(1)}%`);
  console.log(`Content: ${result.content}`);
  if (result.metadata?.file_name) {
    console.log(`Source: ${result.metadata.file_name}`);
  }
});
```

### Search Across All Company Projects

```typescript
import { searchCompanyProjects } from '@/lib/projectEmbeddings';

const results = await searchCompanyProjects(
  supabase,
  companyId,
  'Find all projects related to healthcare',
  0.70,
  20
);

// Group results by project
const byProject = results.reduce((acc, result) => {
  if (!acc[result.project_id]) {
    acc[result.project_id] = [];
  }
  acc[result.project_id].push(result);
  return acc;
}, {} as Record<string, any[]>);

console.log('Found in projects:', Object.keys(byProject));
```

---

## 🔍 Direct RPC Function Calls

### Company Brain Search (Alternative)

```typescript
const { data, error } = await supabase
  .rpc('match_company_brain_documents', {
    query_embedding: embeddingArray, // 768 numbers
    match_user_id: userId,
    match_threshold: 0.78,
    match_count: 10
  });
```

### Project Search (Alternative)

```typescript
const { data, error } = await supabase
  .rpc('match_project_documents', {
    p_query_embedding: embeddingArray,
    p_project_id: projectId,
    p_match_threshold: 0.78,
    p_match_count: 10
  });
```

### Generic Search (Alternative)

```typescript
const { data, error } = await supabase
  .rpc('match_documents', {
    p_table: 'company_brain_embeddings',
    p_query_embedding: embeddingArray,
    p_match_count: 10,
    p_filter: { user_id: userId }
  });
```

---

## 🛠️ Edge Function Invocation

### Generate Project Embedding

```typescript
const { data, error } = await supabase.functions.invoke(
  'generate-project-embedding',
  {
    body: {
      type: 'metadata', // or 'document'
      project_id: projectId,
      company_id: companyId,
      document_id: documentId // only for type='document'
    }
  }
);
```

### Regenerate All Company Embeddings

```typescript
const { data, error } = await supabase.functions.invoke(
  'regenerate-embeddings'
);

console.log(`Processed ${data.companies_processed} companies`);
console.log(`Processed ${data.documents_processed} documents`);
```

### Regenerate All Project Embeddings

```typescript
const { data, error } = await supabase.functions.invoke(
  'regenerate-project-embeddings'
);

console.log(`Processed ${data.projects_processed} projects`);
console.log(`Processed ${data.documents_processed} documents`);
```

---

## 📊 Useful SQL Queries

### Check Embedding Counts

```sql
-- Company Brain embeddings by type
SELECT content_type, COUNT(*) 
FROM company_brain_embeddings 
GROUP BY content_type;

-- Project embeddings by type
SELECT content_type, COUNT(*) 
FROM project_embeddings 
GROUP BY content_type;
```

### Find Documents Without Embeddings

```sql
-- Company documents missing embeddings
SELECT d.id, d.file_name, d.created_at
FROM brain_documents d
LEFT JOIN company_brain_embeddings e 
  ON e.content_id = d.id AND e.content_type = 'document'
WHERE e.id IS NULL;

-- Project documents missing embeddings
SELECT d.id, d.file_name, d.project_id
FROM project_documents d
LEFT JOIN project_embeddings e 
  ON e.content_id = d.id AND e.content_type = 'document'
WHERE e.id IS NULL AND d.is_deleted = false;
```

### Test Vector Search Directly

```sql
-- Generate a test embedding (you need to get this from Gemini API first)
-- Then search:
SELECT 
  content,
  (1 - (embedding <=> '[your 768-dim array here]'::vector)) AS similarity
FROM company_brain_embeddings
WHERE user_id = 'your-user-id'
ORDER BY embedding <=> '[your 768-dim array here]'::vector
LIMIT 5;
```

---

## 🎨 TypeScript Types

```typescript
import type {
  CompanyBrain,
  BrainDocument,
  DocumentGroup,
  CompanyBrainEmbedding,
  Project,
  ProjectMetadata,
  ProjectDocument,
  ProjectEmbedding,
  SearchResult
} from '@/types';
```

---

## 🔐 Storage Bucket URLs

```typescript
// Brain documents bucket
const bucket = 'brain-documents';
const path = `${userId}/${fileName}`;

// Project documents bucket
const bucket = 'project-documents';
const path = `${projectId}/${fileName}`;

// Upload
const { data, error } = await supabase.storage
  .from(bucket)
  .upload(path, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from(bucket)
  .getPublicUrl(path);

// Download
const { data, error } = await supabase.storage
  .from(bucket)
  .download(path);
```

---

## ⚙️ Configuration Options

### Similarity Thresholds

```typescript
// Strict matching (high precision, fewer results)
const threshold = 0.85;

// Balanced (recommended for most use cases)
const threshold = 0.78;

// Loose matching (high recall, more results)
const threshold = 0.70;
```

### Chunk Size for Long Text

```typescript
// Default: 1000 characters
chunkText(longText, 1000);

// Smaller chunks (more granular search)
chunkText(longText, 500);

// Larger chunks (broader context)
chunkText(longText, 1500);
```

---

## 🧪 Testing Utilities

### Test Embedding Generation

```typescript
import { generateEmbedding } from '@/lib/embeddings';

const result = await generateEmbedding('Test query');
console.log('Dimensions:', result.embedding.length); // Should be 768
console.log('Error:', result.error); // Should be undefined
```

### Test Search Flow

```typescript
// 1. Generate embedding
const { embedding } = await generateEmbedding('test query');

// 2. Search directly
const { data } = await supabase
  .rpc('match_company_brain_documents', {
    query_embedding: embedding,
    match_user_id: userId,
    match_threshold: 0.5, // Low threshold for testing
    match_count: 20
  });

console.log('Results:', data);
```

---

## 📈 Performance Tips

1. **Batch Operations**: Generate multiple embeddings before inserting
2. **Debounce Search**: Wait for user to finish typing
3. **Cache Results**: Store frequently accessed queries
4. **Paginate Results**: Don't load all results at once
5. **Background Processing**: Use Edge Functions for bulk operations

---

## 🐛 Common Errors

### "Embedding dimension mismatch"
```
Solution: Ensure using text-embedding-004 model (768 dims)
```

### "Function not found"
```
Solution: Verify RPC functions deployed in Supabase
```

### "Storage upload failed"
```
Solution: Check bucket exists and RLS policies configured
```

### "No results found"
```
Solution: 
1. Check embeddings exist (SQL query)
2. Lower similarity threshold
3. Try broader search query
```

---

## 📞 Support

For issues or questions:
1. Check [BRAIN_SETUP_GUIDE.md](./BRAIN_SETUP_GUIDE.md)
2. Review Supabase Edge Function logs
3. Check browser console for errors
4. Verify environment variables are set correctly

---

**Happy coding!** 🚀
