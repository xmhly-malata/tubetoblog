-- ============================================================
-- Migration 002: Fix profiles table schema for Stripe integration
-- 
-- 问题背景：
--   1. profiles 表缺少 plan, subscription_status 等 Stripe 字段
--   2. profiles 表缺少 email 字段（代码多处用 email 查询但字段不存在）
--   3. user_emails 视图未创建（webhook 依赖此视图查找 user ID）
--   4. 原有 001 迁移可能未执行，本文件包含所有必要变更
-- ============================================================

-- 1. 给 profiles 表添加 email 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. 从 auth.users 回填 email（针对已有用户）
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. 给 email 加唯一约束，防止重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 4. 添加 Stripe 会员字段（与 001 迁移保持一致，用 IF NOT EXISTS 幂等）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_credits_used INTEGER DEFAULT 0;

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_id);

-- 6. 创建 user_emails 视图（webhook 通过此视图安全地用 email 查 user ID）
CREATE OR REPLACE VIEW public.user_emails AS
SELECT id, email FROM auth.users WHERE email IS NOT NULL;

-- 给视图授权（service_role 已有权限，但确保 anon 和 authenticated 也能读，按需调整）
GRANT SELECT ON public.user_emails TO anon;
GRANT SELECT ON public.user_emails TO authenticated;
GRANT SELECT ON public.user_emails TO service_role;

-- 7. 月度积分重置函数
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET monthly_credits_used = 0
  WHERE current_period_end < NOW()
  AND plan = 'pro';
END;
$$ LANGUAGE plpgsql;

-- 8. 周期变更时自动重置积分的触发器
CREATE OR REPLACE FUNCTION trigger_reset_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.current_period_end < NOW() AND NEW.current_period_end > OLD.current_period_end THEN
      NEW.monthly_credits_used = 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_period_end_change ON profiles;
CREATE TRIGGER on_period_end_change
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_reset_credits();
