package migrations

// RegisteredMigrations returns the production migration sequence.
func (r *Runner) RegisteredMigrations() []Migration {
	return []Migration{
		{
			ID: "001-remove-legacy-network-metadata",
			Up: legacyNetworkMetadata,
		},
		{
			ID: "002-remove-legacy-topology-files",
			Up: legacyTopologyFiles,
		},
		{
			ID: "003-reset-localtest-data",
			Up: r.resetLocaltestData,
		},
		{
			ID: "004-remove-legacy-resource-markers",
			Up: legacyResourceMarkers,
		},
		{
			ID: "005-remove-legacy-app-manager-files",
			Up: legacyAppManagerFiles,
		},
	}
}
