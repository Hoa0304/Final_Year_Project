                -- Smart Notification System Migration
                -- Provides filtering, prioritization, frequency control, and user preferences

                -- Create enum types for notifications
                CREATE TYPE notification_type AS ENUM (
                'order_placed',
                'order_completed',
                'order_cancelled',
                'task_completed',
                'task_reward_claimed',
                'stock_price_alert',
                'balance_low',
                'balance_high',
                'product_discount',
                'new_product',
                'system_announcement',
                'game_completed',
                'game_reward',
                'rating_received',
                'cart_reminder'
                );

                CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
                CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'email', 'sms');
                CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed', 'blocked');

                -- Notifications table
                CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type notification_type NOT NULL,
                priority notification_priority DEFAULT 'medium',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                data JSONB, -- Additional data (e.g., order_id, product_id, etc.)
                channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
                scheduled_at TIMESTAMP WITH TIME ZONE,
                expires_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- User notification preferences
                CREATE TABLE IF NOT EXISTS user_notification_preferences (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                notification_type notification_type NOT NULL,
                enabled BOOLEAN DEFAULT true,
                channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
                min_priority notification_priority DEFAULT 'low', -- Only send notifications with this priority or higher
                max_per_day INTEGER DEFAULT 10, -- Maximum notifications per day for this type
                cooldown_minutes INTEGER DEFAULT 0, -- Cooldown period in minutes between same-type notifications
                quiet_hours_start TIME, -- Start of quiet hours (e.g., '22:00')
                quiet_hours_end TIME, -- End of quiet hours (e.g., '08:00')
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, notification_type)
                );

                -- Notification history (tracks delivery status)
                CREATE TABLE IF NOT EXISTS notification_history (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                channel notification_channel NOT NULL,
                status notification_status DEFAULT 'pending',
                sent_at TIMESTAMP WITH TIME ZONE,
                delivered_at TIMESTAMP WITH TIME ZONE,
                read_at TIMESTAMP WITH TIME ZONE,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );

                -- Notification frequency tracking (for cooldown and rate limiting)
                CREATE TABLE IF NOT EXISTS notification_frequency_tracking (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                notification_type notification_type NOT NULL,
                last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
                count_today INTEGER DEFAULT 1,
                date DATE NOT NULL DEFAULT CURRENT_DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, notification_type, date)
                );

                -- Indexes for performance
                CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
                CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
                CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
                CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
                CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
                CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

                CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
                CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_type ON user_notification_preferences(notification_type);

                CREATE INDEX IF NOT EXISTS idx_notification_history_notification_id ON notification_history(notification_id);
                CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
                CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
                CREATE INDEX IF NOT EXISTS idx_notification_history_channel ON notification_history(channel);

                CREATE INDEX IF NOT EXISTS idx_notification_frequency_user_type ON notification_frequency_tracking(user_id, notification_type);
                CREATE INDEX IF NOT EXISTS idx_notification_frequency_date ON notification_frequency_tracking(date);

                -- Trigger to update updated_at
                CREATE TRIGGER update_notifications_updated_at
                BEFORE UPDATE ON notifications
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

                CREATE TRIGGER update_user_notification_preferences_updated_at
                BEFORE UPDATE ON user_notification_preferences
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

                CREATE TRIGGER update_notification_history_updated_at
                BEFORE UPDATE ON notification_history
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

                CREATE TRIGGER update_notification_frequency_tracking_updated_at
                BEFORE UPDATE ON notification_frequency_tracking
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();

                -- Function to check if notification should be sent based on frequency rules
                CREATE OR REPLACE FUNCTION can_send_notification(
                p_user_id UUID,
                p_notification_type notification_type,
                p_cooldown_minutes INTEGER DEFAULT 0
                )
                RETURNS BOOLEAN AS $$
                DECLARE
                v_preference RECORD;
                v_frequency RECORD;
                v_count_today INTEGER;
                v_last_sent_at TIMESTAMP WITH TIME ZONE;
                v_now TIMESTAMP WITH TIME ZONE := NOW();
                v_current_time TIME := CURRENT_TIME;
                BEGIN
                -- Get user preference
                SELECT * INTO v_preference
                FROM user_notification_preferences
                WHERE user_id = p_user_id AND notification_type = p_notification_type;

                -- If no preference exists, use defaults (enabled, no limits)
                IF NOT FOUND THEN
                    -- Check if user is active (not deleted)
                    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
                    RETURN FALSE;
                    END IF;
                    RETURN TRUE;
                END IF;

                -- Check if notification type is disabled
                IF NOT v_preference.enabled THEN
                    RETURN FALSE;
                END IF;

                -- Check quiet hours
                IF v_preference.quiet_hours_start IS NOT NULL AND v_preference.quiet_hours_end IS NOT NULL THEN
                    IF v_preference.quiet_hours_start > v_preference.quiet_hours_end THEN
                    -- Quiet hours span midnight (e.g., 22:00 to 08:00)
                    IF v_current_time >= v_preference.quiet_hours_start OR v_current_time <= v_preference.quiet_hours_end THEN
                        RETURN FALSE;
                    END IF;
                    ELSE
                    -- Normal quiet hours (e.g., 22:00 to 08:00)
                    IF v_current_time >= v_preference.quiet_hours_start AND v_current_time <= v_preference.quiet_hours_end THEN
                        RETURN FALSE;
                    END IF;
                    END IF;
                END IF;

                -- Get frequency tracking
                SELECT * INTO v_frequency
                FROM notification_frequency_tracking
                WHERE user_id = p_user_id 
                    AND notification_type = p_notification_type 
                    AND date = CURRENT_DATE;

                -- Check daily limit
                IF FOUND THEN
                    v_count_today := v_frequency.count_today;
                    v_last_sent_at := v_frequency.last_sent_at;

                    -- Check daily limit
                    IF v_count_today >= v_preference.max_per_day THEN
                    RETURN FALSE;
                    END IF;

                    -- Check cooldown period
                    IF p_cooldown_minutes > 0 OR v_preference.cooldown_minutes > 0 THEN
                    DECLARE
                        v_cooldown_minutes INTEGER := GREATEST(p_cooldown_minutes, v_preference.cooldown_minutes);
                        v_cooldown_interval INTERVAL := (v_cooldown_minutes || ' minutes')::INTERVAL;
                    BEGIN
                        IF v_last_sent_at IS NOT NULL AND (v_now - v_last_sent_at) < v_cooldown_interval THEN
                        RETURN FALSE;
                        END IF;
                    END;
                    END IF;
                END IF;

                RETURN TRUE;
                END;
                $$ LANGUAGE plpgsql;

                -- Function to record notification frequency
                CREATE OR REPLACE FUNCTION record_notification_sent(
                p_user_id UUID,
                p_notification_type notification_type
                )
                RETURNS VOID AS $$
                BEGIN
                INSERT INTO notification_frequency_tracking (user_id, notification_type, last_sent_at, count_today, date)
                VALUES (p_user_id, p_notification_type, NOW(), 1, CURRENT_DATE)
                ON CONFLICT (user_id, notification_type, date)
                DO UPDATE SET
                    count_today = notification_frequency_tracking.count_today + 1,
                    last_sent_at = NOW(),
                    updated_at = NOW();
                END;
                $$ LANGUAGE plpgsql;

                -- Comments
                COMMENT ON TABLE notifications IS 'All notifications sent to users';
                COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification types, channels, and frequency';
                COMMENT ON TABLE notification_history IS 'Tracks delivery status of notifications across different channels';
                COMMENT ON TABLE notification_frequency_tracking IS 'Tracks notification frequency to enforce cooldown and daily limits';

                COMMENT ON FUNCTION can_send_notification IS 'Checks if a notification can be sent based on user preferences and frequency rules';
                COMMENT ON FUNCTION record_notification_sent IS 'Records that a notification was sent for frequency tracking';




















