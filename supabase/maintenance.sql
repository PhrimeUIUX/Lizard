-- Optional maintenance helpers

-- Remove stale rate-limit rows older than 7 days.
create or replace function public.cleanup_rate_limits(p_older_than interval default interval '7 days')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint;
begin
  delete from public.rate_limits
  where last_pressed_at < now() - p_older_than;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_rate_limits(interval) from public;
grant execute on function public.cleanup_rate_limits(interval) to service_role;
