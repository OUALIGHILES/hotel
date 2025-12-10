-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  price_sar NUMERIC NOT NULL,
  description TEXT,
  features JSONB NOT NULL,
  billing_cycle VARCHAR DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR DEFAULT 'active',
  subscription_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  renewal_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  moyasser_payment_id VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, plan_id)
);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "subscription_plans_select_all" ON subscription_plans FOR SELECT USING (true);
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_subscriptions_insert_own" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_subscriptions_update_own" ON user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price_sar, description, features) VALUES
(
  'Professional',
  499,
  'Perfect for property managers with 1-5 properties',
  jsonb_build_object(
    'properties', 5,
    'units', 20,
    'users', 3,
    'support', 'Email support',
    'reports', true,
    'channels', 3,
    'payment_processing', true
  )
),
(
  'Enterprise',
  1299,
  'For large-scale operations with unlimited properties',
  jsonb_build_object(
    'properties', 'unlimited',
    'units', 'unlimited',
    'users', 'unlimited',
    'support', '24/7 Phone & Email support',
    'reports', true,
    'channels', 'unlimited',
    'payment_processing', true,
    'api_access', true,
    'custom_branding', true
  )
);
