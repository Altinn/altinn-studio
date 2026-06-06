package kind

import (
	"bytes"
	"context"
	"fmt"
	"path/filepath"

	"altinn.studio/devenv/pkg/cabundle"
)

func (r *KindContainerRuntime) configureCABundleInNodes(ctx context.Context) error {
	bundle, configured, err := cabundle.FromEnv()
	if err != nil {
		return fmt.Errorf("resolve CA bundle: %w", err)
	}
	if !configured {
		return nil
	}

	writeKindStdoutln("Configuring CA bundle in kind nodes...")

	nodes, err := r.getKindNodes()
	if err != nil {
		return err
	}

	for _, node := range nodes {
		if err := r.copyCABundleToNode(ctx, node, bundle.Data); err != nil {
			return err
		}
		if err := r.registerCABundleInNode(ctx, node); err != nil {
			return err
		}
	}

	writeKindStdoutf("✓ Configured CA bundle in %d kind nodes\n", len(nodes))
	return nil
}

func (r *KindContainerRuntime) copyCABundleToNode(ctx context.Context, node string, data []byte) error {
	if err := r.ContainerClient.Exec(
		ctx,
		node,
		[]string{"mkdir", "-p", filepath.Dir(cabundle.ContainerPath)},
	); err != nil {
		return fmt.Errorf("create CA bundle directory in node %s: %w", node, err)
	}
	if err := r.ContainerClient.ExecWithIO(
		ctx,
		node,
		[]string{"cp", "/dev/stdin", cabundle.ContainerPath},
		bytes.NewReader(data),
		nil,
		nil,
	); err != nil {
		return fmt.Errorf("copy CA bundle to node %s: %w", node, err)
	}
	return nil
}

func (r *KindContainerRuntime) registerCABundleInNode(ctx context.Context, node string) error {
	if err := r.ContainerClient.Exec(ctx, node, []string{"sh", "-c", cabundle.RegistrationScript()}); err != nil {
		return fmt.Errorf("register CA bundle in node %s: %w", node, err)
	}
	return nil
}
