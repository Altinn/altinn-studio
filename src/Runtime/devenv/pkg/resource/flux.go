//nolint:revive // Resource method names are fixed by interfaces.
package resource

// FluxInstallation represents Flux controllers installed in a Kubernetes cluster.
type FluxInstallation struct {
	Enabled    *bool
	Name       string
	Cluster    ResourceRef
	Components []string
	DependsOn  []ResourceRef
}

func (r *FluxInstallation) ID() ResourceID {
	return ResourceID("flux-installation:" + r.Name)
}

func (r *FluxInstallation) Dependencies() []ResourceRef {
	return appendWithRequiredRef(r.DependsOn, r.Cluster)
}

func (r *FluxInstallation) IsEnabled() bool {
	return Enabled(r.Enabled)
}

func (r *FluxInstallation) Validate() error {
	if err := validateName(r.Name); err != nil {
		return err
	}
	return validateRef(r.Cluster, errClusterReferenceRequired)
}

var (
	_ Resource           = (*FluxInstallation)(nil)
	_ Validator          = (*FluxInstallation)(nil)
	_ EnablementProvider = (*FluxInstallation)(nil)
)
