// Package helm wraps the Helm SDK operations used by the local runtime fixture.
package helm

import (
	"fmt"
	"os"

	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/chartutil"
	"helm.sh/helm/v3/pkg/registry"
)

// Client wraps Helm chart packaging and registry operations.
type Client struct {
	registryClient *registry.Client
}

// NewClient creates a Helm client backed by Helm's OCI registry client.
func NewClient(plainHTTP bool) (*Client, error) {
	opts := []registry.ClientOption{}
	if plainHTTP {
		opts = append(opts, registry.ClientOptPlainHTTP())
	}

	regClient, err := registry.NewClient(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create registry client: %w", err)
	}

	return &Client{registryClient: regClient}, nil
}

// PackageChart loads a chart from chartPath and packages it to destDir.
// Returns the path to the packaged .tgz file.
func (c *Client) PackageChart(chartPath, destDir string) (string, error) {
	chart, err := loader.LoadDir(chartPath)
	if err != nil {
		return "", fmt.Errorf("failed to load chart from %s: %w", chartPath, err)
	}

	packagedPath, err := chartutil.Save(chart, destDir)
	if err != nil {
		return "", fmt.Errorf("failed to package chart: %w", err)
	}

	return packagedPath, nil
}

// PushChart pushes a packaged chart (.tgz) to the OCI registry.
// ociRef should be the base registry reference (e.g., "oci://localhost:5001").
// The chart name and version are extracted from the chart and appended to form the full ref.
func (c *Client) PushChart(chartFile, ociRef string) error {
	// Load chart to get metadata
	//nolint:gosec // chartFile is produced from the local project configuration.
	f, err := os.Open(chartFile)
	if err != nil {
		return fmt.Errorf("failed to open chart file: %w", err)
	}
	defer closeFile(f)

	chart, err := loader.LoadArchive(f)
	if err != nil {
		return fmt.Errorf("failed to load chart archive: %w", err)
	}

	// Read file contents for push
	//nolint:gosec // chartFile is produced from the local project configuration.
	chartBytes, err := os.ReadFile(chartFile)
	if err != nil {
		return fmt.Errorf("failed to read chart file %s: %w", chartFile, err)
	}

	// Construct full OCI reference: oci://registry/name:version
	fullRef := fmt.Sprintf("%s/%s:%s", ociRef, chart.Metadata.Name, chart.Metadata.Version)

	_, err = c.registryClient.Push(chartBytes, fullRef)
	if err != nil {
		return fmt.Errorf("failed to push chart to %s: %w", fullRef, err)
	}

	return nil
}

//nolint:errcheck,gosec // Chart file close only releases the local descriptor.
func closeFile(f *os.File) {
	f.Close()
}
