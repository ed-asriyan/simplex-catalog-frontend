# SimpleX Servers Registry Validator
Backend service and performs scheduled validation of SimpleX Servers Registry.

## How to run
1. Setup [Supabase](https://supabase.com) account, create project
2. Create table in `public` schema (e.g using SQL editor page in Supabase project):
   ```sql
   CREATE TABLE servers (
      uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      uri TEXT UNIQUE CHECK (uri ~* '^(smp|xftp)://.+@.+$'),
      info_page_available BOOLEAN,
      country TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      status BOOLEAN,
      status_since TIMESTAMP,
      last_check TIMESTAMP
   );
   ```
3. Enable realtime for the table
4. Allow INSERT and SELECT for `public` in the table security policy
5. Fill variables in files in [.env](./.env)
6. Run `docker compose up -d`
