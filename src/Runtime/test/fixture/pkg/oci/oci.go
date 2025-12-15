package oci

import (
	"context"
	"fmt"

	ociclient "github.com/fluxcd/pkg/oci"
)

type Client struct {
	client *ociclient.Client
}

func NewClient() *Client {
	return &Client{
		client: ociclient.NewClient(ociclient.DefaultOptions()),
	}
}

// PushArtifact pushes an OCI artifact to a registry
func (c *Client) PushArtifact(url, path, source, revision string) error {
	ctx := context.Background()

	ref, err := ociclient.ParseArtifactURL(url)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	metadata := ociclient.Metadata{
		Source:   source,
		Revision: revision,
	}

	_, err = c.client.Push(ctx, ref, path,
		ociclient.WithPushMetadata(metadata),
		ociclient.WithPushLayerType(ociclient.LayerTypeTarball),
	)
	if err != nil {
		return fmt.Errorf("failed to push artifact to %s: %w", url, err)
	}

	return nil
}
