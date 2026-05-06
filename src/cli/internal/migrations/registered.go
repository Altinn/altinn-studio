package migrations

func registeredMigrations() []Migration {
	return []Migration{
		{
			ID: "001-remove-legacy-network-metadata",
			Up: legacyNetworkMetadata,
		},
		{
			ID: "002-remove-legacy-topology-files",
			Up: legacyTopologyFiles,
		},
	}
}
