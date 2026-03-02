-- Quick checks after running schema.sql

-- 1) Public counter exists
select * from public.app_counters where key = 'public_total';

-- 2) RPC callable and rate limit behavior
-- Run this twice quickly; second call should return Too fast error.
select public.press_lizard('guest:verify_script_user') as first_press;
select public.press_lizard('guest:verify_script_user') as second_press;

-- 3) Leaderboard shape
select * from public.get_leaderboard(10);
