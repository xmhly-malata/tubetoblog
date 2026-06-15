-- 003: Change profiles.id from uuid to text
-- Fix: NextAuth user IDs (Google/GitHub) are NOT UUIDs. 
-- Google user IDs are 21-digit numeric strings, GitHub IDs are integers.
-- profiles.id must accept these non-UUID values for NextAuth integration to work.

BEGIN;

-- 1. Drop existing primary key constraint (if any)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pkey' AND conrelid = 'profiles'::regclass
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_pkey;
    END IF;
END;
$$;

-- 2. Change id column from uuid to text
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;

-- 3. Re-add primary key constraint
ALTER TABLE profiles ADD PRIMARY KEY (id);

COMMIT;
