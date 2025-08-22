CREATE INDEX IF NOT EXISTS idx_releases_org_app ON designer.releases(org, app);
CREATE INDEX IF NOT EXISTS idx_deployments_org_app ON designer.deployments(org, app);
