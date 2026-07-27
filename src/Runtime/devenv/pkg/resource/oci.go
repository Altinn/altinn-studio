//nolint:revive // Resource method names are fixed by interfaces.
package resource

import "errors"

var (
	errOCIArtifactFormatUnknown = errors.New("oci artifact format is unknown")
	errURLRequired              = errors.New("url is required")
)

// OCIArtifactFormat identifies how an OCI artifact should be produced.
type OCIArtifactFormat string

const (
	// OCIArtifactFormatGeneric pushes a generic Flux OCI artifact.
	OCIArtifactFormatGeneric OCIArtifactFormat = "generic"
	// OCIArtifactFormatHelmChart packages a Helm chart and pushes it as a Helm OCI artifact.
	OCIArtifactFormatHelmChart OCIArtifactFormat = "helm-chart"
)

// OCIArtifact represents an OCI artifact pushed to a registry.
type OCIArtifact struct {
	Enabled   *bool
	Format    OCIArtifactFormat
	Name      string
	URL       string
	Path      string
	Source    string
	Revision  string
	DependsOn []ResourceRef
}

func (r *OCIArtifact) ID() ResourceID {
	return ResourceID("oci-artifact:" + r.Name)
}

func (r *OCIArtifact) Dependencies() []ResourceRef {
	return cloneRefs(r.DependsOn)
}

func (r *OCIArtifact) IsEnabled() bool {
	return Enabled(r.Enabled)
}

func (r *OCIArtifact) Validate() error {
	if err := validateName(r.Name); err != nil {
		return err
	}
	if r.URL == "" {
		return errURLRequired
	}
	if r.Path == "" {
		return errPathRequired
	}
	switch r.Format {
	case "", OCIArtifactFormatGeneric, OCIArtifactFormatHelmChart:
	default:
		return errOCIArtifactFormatUnknown
	}
	return nil
}

var (
	_ Resource           = (*OCIArtifact)(nil)
	_ Validator          = (*OCIArtifact)(nil)
	_ EnablementProvider = (*OCIArtifact)(nil)
)
