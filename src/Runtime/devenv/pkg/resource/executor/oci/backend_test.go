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

func TestApplyOCIArtifactPushesHelmChart(t *testing.T) {
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
	if helmClient.pushed != "charts/deployment|oci://localhost:5001" {
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
	pushed string
}

func (f *fakeHelm) PushChart(chartPath, ociRef string) error {
	f.pushed = chartPath + "|" + ociRef
	return nil
}
