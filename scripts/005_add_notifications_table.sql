-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(255), -- URL to redirect when notification is clicked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create a function to insert a notification
CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id UUID,
  p_title VARCHAR,
  p_message TEXT,
  p_type VARCHAR DEFAULT 'info',
  p_action_url VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url)
  VALUES (p_user_id, p_title, p_message, p_type, p_action_url)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's display name safely
CREATE OR REPLACE FUNCTION get_user_display_name(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_name TEXT;
BEGIN
  SELECT COALESCE(full_name, email, 'Unknown User') INTO user_name
  FROM profiles
  WHERE id = p_user_id;

  IF user_name IS NULL THEN
    SELECT COALESCE(email, 'Unknown User') INTO user_name
    FROM auth.users
    WHERE id = p_user_id;
  END IF;

  RETURN COALESCE(user_name, 'Unknown User');
END;
$$ LANGUAGE plpgsql;

-- Create triggers to send notifications on specific events

-- Trigger for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender name safely
  sender_name := get_user_display_name(NEW.sender_id);

  -- Send notification to recipient
  PERFORM insert_notification(
    NEW.recipient_id,
    'New Message Received',
    'You have received a new message from ' || sender_name,
    'info',
    '/dashboard/messages'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires when a new message is inserted
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Trigger for new reservations that affect a host
CREATE OR REPLACE FUNCTION notify_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
  host_id UUID;
BEGIN
  -- Get the host id from the property
  SELECT user_id INTO host_id
  FROM properties
  JOIN units ON properties.id = units.property_id
  WHERE units.id = NEW.unit_id;

  -- Send notification to property host
  IF host_id IS NOT NULL THEN
    PERFORM insert_notification(
      host_id,
      'New Reservation',
      'A new reservation has been made for ' || (SELECT name FROM units WHERE id = NEW.unit_id) || ' from ' || NEW.check_in_date::text || ' to ' || NEW.check_out_date::text,
      'info',
      '/dashboard/reservations'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires when a new reservation is inserted
DROP TRIGGER IF EXISTS trigger_notify_new_reservation ON reservations;
CREATE TRIGGER trigger_notify_new_reservation
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_reservation();

-- Trigger for new reservations that affect a host
CREATE OR REPLACE FUNCTION notify_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
  host_id UUID;
  unit_name TEXT;
  host_name TEXT;
BEGIN
  -- Get the host id from the property
  SELECT user_id, u.name INTO host_id, unit_name
  FROM properties
  JOIN units u ON properties.id = u.property_id
  WHERE u.id = NEW.unit_id;

  -- Send notification to property host
  IF host_id IS NOT NULL THEN
    host_name := get_user_display_name(host_id);
    PERFORM insert_notification(
      host_id,
      'New Reservation',
      'A new reservation has been made for ' || COALESCE(unit_name, 'unit') || ' from ' || NEW.check_in_date::text || ' to ' || NEW.check_out_date::text,
      'info',
      '/dashboard/reservations'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires when a new reservation is inserted
DROP TRIGGER IF EXISTS trigger_notify_new_reservation ON reservations;
CREATE TRIGGER trigger_notify_new_reservation
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_reservation();

-- Trigger for new tasks
CREATE OR REPLACE FUNCTION notify_new_task()
RETURNS TRIGGER AS $$
DECLARE
  assignee_id UUID;
  assignee_name TEXT;
  property_name TEXT;
BEGIN
  -- Get the user id of the assigned user
  assignee_id := NEW.assigned_to;

  -- Send notification to assigned user if one is assigned
  IF assignee_id IS NOT NULL THEN
    assignee_name := get_user_display_name(assignee_id);
    SELECT name INTO property_name FROM properties WHERE id = NEW.property_id;

    PERFORM insert_notification(
      assignee_id,
      'New Task Assigned',
      'A new task "' || NEW.title || '" has been assigned to you for ' || COALESCE(property_name, 'property'),
      'info',
      '/dashboard/tasks'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires when a new task is inserted
DROP TRIGGER IF EXISTS trigger_notify_new_task ON tasks;
CREATE TRIGGER trigger_notify_new_task
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_task();