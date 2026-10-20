-- One-save provisioning: the application role may create sites and memberships, but ONLY when the
-- acting user (app.current_user_id) is a platform administrator. Enforced by the database, not just the API.
DO $$ BEGIN
  GRANT INSERT ON sites, user_site_roles TO opshub_app;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
--> statement-breakpoint
CREATE POLICY platform_admin_insert ON sites FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = app_user_id() AND u.is_platform_admin));
--> statement-breakpoint
CREATE POLICY platform_admin_insert ON user_site_roles FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = app_user_id() AND u.is_platform_admin));
--> statement-breakpoint
DO $$ BEGIN
  GRANT DELETE ON site_drafts TO opshub_app;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

