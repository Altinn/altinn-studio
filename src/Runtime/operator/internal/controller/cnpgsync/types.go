package cnpgsync

// CnpgTarget defines a serviceowner/environment combination
// that should have the CNPG operator installed, and the apps that should receive databases.
type CnpgTarget struct {
	ServiceOwnerId string
	Environment    string
	Apps           []string
}

// DefaultTargets returns the default list of targets for CNPG operator installation.
func DefaultTargets() []CnpgTarget {
	return []CnpgTarget{
		{ServiceOwnerId: "ttd", Environment: "localtest", Apps: []string{"localtestapp"}},
		{ServiceOwnerId: "ttd", Environment: "tt02", Apps: []string{"martinotest"}},
		{ServiceOwnerId: "nhn", Environment: "tt02", Apps: []string{"mottak-adapter"}},
	}
}
