-- ================================================================
-- VajraScan: Scans & Findings Tables
-- Run this in your Supabase SQL Editor to fix the storage errors
-- ================================================================

-- Enable UUID extension (idempotent)
create extension if not exists "uuid-ossp";

----------------------------------------------------------------
-- 1. SCANS TABLE
----------------------------------------------------------------
create table if not exists public.scans (
  id           uuid primary key default uuid_generate_v4(),
  target_url   text not null,
  status       text not null default 'pending',   -- 'pending','running','completed','error'
  scan_type    text not null default 'full',       -- 'full','quick','custom'
  result_summary jsonb default '{}'::jsonb,
  scan_logs    jsonb default '[]'::jsonb,
  created_at   timestamp with time zone default timezone('utc'::text, now()),
  completed_at timestamp with time zone,
  project_id   text,                              -- optional project context
  error_message text
);

-- Allow reads/writes from the service role (backend only, no RLS needed)
alter table public.scans enable row level security;

-- Service role bypasses RLS automatically.
-- If you also need anon/authenticated access, add policies here:
create policy "Allow service role full access on scans"
  on public.scans
  using (true)
  with check (true);

----------------------------------------------------------------
-- 2. FINDINGS TABLE
----------------------------------------------------------------
create table if not exists public.findings (
  id               uuid primary key default uuid_generate_v4(),
  scan_id          uuid not null references public.scans(id) on delete cascade,
  title            text not null,
  severity         text default 'info',           -- 'critical','high','medium','low','info'
  description      text,
  remediation      text,
  evidence         text,
  reproduction_url text,
  created_at       timestamp with time zone default timezone('utc'::text, now())
);

alter table public.findings enable row level security;

create policy "Allow service role full access on findings"
  on public.findings
  using (true)
  with check (true);

-- Index for fast scan-based lookups
create index if not exists idx_findings_scan_id on public.findings(scan_id);
create index if not exists idx_scans_created_at on public.scans(created_at desc);
