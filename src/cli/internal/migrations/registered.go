package migrations

func (r *Runner) registeredMigrations() []Migration {
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
	}
}
