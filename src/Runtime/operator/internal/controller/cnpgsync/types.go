package cnpgsync

// CnpgTarget defines a serviceowner/environment combination
// that should have the CNPG operator installed.
type CnpgTarget struct {
	ServiceOwnerId string
	Environment    string
}

// DefaultTargets returns the default list of targets for CNPG operator installation.
func DefaultTargets() []CnpgTarget {
	return []CnpgTarget{
		{ServiceOwnerId: "ttd", Environment: "localtest"},
		{ServiceOwnerId: "ttd", Environment: "tt02"},
	}
}
