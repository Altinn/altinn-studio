package migrations

func registeredMigrations() []Migration {
	return []Migration{
		{
			ID: "001-remove-legacy-network-metadata",
			Up: legacyNetworkMetadata,
		},
	}
}
