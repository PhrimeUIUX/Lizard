-- Quick checks after running schema.sql

-- 1) Public counter exists
select * from public.app_counters where key = 'public_total';

-- 2) RPC callable behavior (no per-press throttle in batch mode)
select public.press_lizard('guest:verify_script_user') as first_press;
select public.press_lizard('guest:verify_script_user') as second_press;
select public.press_lizard_batch('guest:verify_script_user', 5) as batch_press;

-- 3) Leaderboard shape
select * from public.get_leaderboard(10);
