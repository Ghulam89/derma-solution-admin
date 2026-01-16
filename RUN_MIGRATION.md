# Migration Run Karne Ke Commands

## Method 1: Supabase Dashboard (Easiest - Recommended)

### Steps:
1. Supabase Dashboard kholen: https://supabase.com/dashboard
2. Apna project select karein
3. Left sidebar se **"SQL Editor"** click karein
4. **"New query"** button click karein
5. Neeche wala SQL copy-paste karein:

```sql
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';
```

6. **"Run"** button click karein (ya `Ctrl+Enter` press karein)
7. Success message dikhega: ✅ "Success. No rows returned"

---

## Method 2: Supabase CLI (Terminal Se)

### Prerequisites:
- Supabase CLI installed hona chahiye
- Project linked hona chahiye

### Commands:

```bash
# 1. Supabase project link karein (agar pehle se linked nahi hai)
supabase link --project-ref your-project-ref

# 2. Migration file run karein
supabase db push

# Ya directly SQL run karein:
supabase db execute --file migrate_add_treatment_options.sql
```

### Agar CLI installed nahi hai:
```bash
# Install Supabase CLI
npm install -g supabase

# Login karein
supabase login

# Link project
supabase link --project-ref your-project-ref

# Migration run karein
supabase db execute --file migrate_add_treatment_options.sql
```

---

## Method 3: Direct SQL Command (Copy-Paste)

### Simple Version (Minimum):
```sql
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';
```

### Complete Version (With Comment):
```sql
-- Add treatment_options column
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';

-- Add comment
COMMENT ON COLUMN public.services.treatment_options IS 
'Array of treatment subcategories with name, image, and pricing array';
```

---

## Method 4: psql Command (PostgreSQL Client)

Agar aap directly PostgreSQL se connect kar sakte hain:

```bash
psql -h your-db-host -U postgres -d postgres -f migrate_add_treatment_options.sql
```

Ya connection string ke saath:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" -f migrate_add_treatment_options.sql
```

---

## Verification Command

Migration run karne ke baad verify karein:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'services' 
  AND column_name = 'treatment_options';
```

**Expected Result:**
```
column_name        | data_type | column_default
-------------------+-----------+----------------
treatment_options  | jsonb     | '[]'::jsonb
```

---

## Quick Reference

### Supabase Dashboard:
1. SQL Editor → New Query
2. SQL paste karein
3. Run button click karein

### Terminal/CLI:
```bash
supabase db execute --file migrate_add_treatment_options.sql
```

### Direct SQL:
```sql
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS treatment_options JSONB DEFAULT '[]';
```

---

## Troubleshooting

### Error: "Column already exists"
- ✅ Column pehle se hai, koi action ki zarurat nahi

### Error: "Permission denied"
- Admin rights check karein
- Project owner se contact karein

### Error: "Table does not exist"
- Table name verify karein: `services` (not `service`)
- Schema check karein: `public.services`
