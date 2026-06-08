package ocibackend

import (
	"strings"
	"testing"

	"altinn.studio/devenv/pkg/resource"
	"altinn.studio/devenv/pkg/resource/executor"
)

func TestApplyOCIArtifactPushesArtifact(t *testing.T) {
	t.Parallel()

	ociClient := &fakeOCI{}
	backend := &Backend{oci: ociClient, helm: &fakeHelm{}}
	artifact := &resource.OCIArtifact{Name: "artifact", URL: "oci://localhost:5001/app", Path: "path"}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, artifact); err != nil {
		t.Fatalf("Apply(OCIArtifact) error = %v", err)
	}
	if ociClient.pushed != "oci://localhost:5001/app|path|local|local" {
		t.Fatalf("oci pushed = %q", ociClient.pushed)
	}
}

func TestApplyOCIArtifactPackagesHelmChart(t *testing.T) {
	t.Parallel()

	helmClient := &fakeHelm{}
	backend := &Backend{oci: &fakeOCI{}, helm: helmClient}
	artifact := &resource.OCIArtifact{
		Name:   "deployment-chart",
		URL:    "oci://localhost:5001",
		Path:   "charts/deployment",
		Format: resource.OCIArtifactFormatHelmChart,
	}

	if _, err := backend.Apply(t.Context(), executor.BackendContext{GraphID: "test"}, artifact); err != nil {
		t.Fatalf("Apply(OCIArtifact helm-chart) error = %v", err)
	}
	if helmClient.packaged != "charts/deployment" {
		t.Fatalf("packaged = %q", helmClient.packaged)
	}
	if !strings.Contains(helmClient.pushed, "oci://localhost:5001") {
		t.Fatalf("pushed = %q", helmClient.pushed)
	}
}

type fakeOCI struct {
	pushed string
}

func (f *fakeOCI) PushArtifact(url, path, source, revision string) error {
	f.pushed = strings.Join([]string{url, path, source, revision}, "|")
	return nil
}

type fakeHelm struct {
	packaged string
	pushed   string
}

func (f *fakeHelm) PackageChart(chartPath, destDir string) (string, error) {
	f.packaged = chartPath
	return destDir + "/chart.tgz", nil
}

func (f *fakeHelm) PushChart(chartFile, ociRef string) error {
	f.pushed = chartFile + "|" + ociRef
	return nil
}
