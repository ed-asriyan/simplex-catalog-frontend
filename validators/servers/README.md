# SimpleX Servers Registry Validator
Backend service and performs scheduled validation of SimpleX Servers Registry.

## How to run
1. Setup [Supabase](https://supabase.com) account, create project
2. Create table `servers` in `public` schema with the following columns:
   * `uuid` uuid, primary, default: `gen_random_uuid()`
   * `uri` text, is uniqie, check constraint: `uri ~* '^(smp|xftp)://.+@.+$'::text`
   * `country` text, is nullable
   * `created_at` timestamp, default: `now()`
   * `status` bool, is nullable
   * `status_since` timestamp, is nullable
   * `last_check` timestamp, is nullable
3. Enable realtime for the table
4. Allow INSERT and SELECT for `public` in the table security policy
4. Fill variables in files in [.env](./.env)
5. Run `docker compose up -d`
