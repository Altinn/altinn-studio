package cnpgsync

// CnpgTarget defines a serviceowner/environment combination
// that should have the CNPG operator installed, and the apps that should receive databases.
type CnpgTarget struct {
	Backup         *PgDumpBackupConfig
	ServiceOwnerId string
	Environment    string
	Apps           []string
}

// PgDumpBackupConfig configures pg_dump backup jobs for a target.
type PgDumpBackupConfig struct {
	Schedule         string
	PvcName          string
	PvcSize          string
	StorageClassName string
	RetentionDays    int
	Enabled          bool
}

// DefaultTargets returns the default list of targets for CNPG operator installation.
func DefaultTargets() []CnpgTarget {
	backup := &PgDumpBackupConfig{
		Enabled:          true,
		Schedule:         "0 2 * * *",
		RetentionDays:    14,
		PvcName:          "pgdump-backups",
		PvcSize:          "20Gi",
		StorageClassName: backupStorageClass,
	}

	return []CnpgTarget{
		{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"localtestapp"}},
		{ServiceOwnerId: "ttd", Environment: "tt02", Apps: []string{"martinotest"}, Backup: backup},
		{ServiceOwnerId: "nhn", Environment: "tt02", Apps: []string{"mottak-adapter"}, Backup: backup},
		{ServiceOwnerId: "nhn", Environment: "prod", Apps: []string{"mottak-adapter"}, Backup: backup},
	}
}
