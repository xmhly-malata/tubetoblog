-- Add membership fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_credits_used INTEGER DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_id);

-- Create function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET monthly_credits_used = 0
  WHERE current_period_end < NOW()
  AND plan = 'pro';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-reset credits on period end
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