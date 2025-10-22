package kind

import (
	"fmt"
	"strings"
	"time"

	"altinn.studio/runtime-fixture/pkg/flux"
)

// isFluxInstalled checks if Flux is already installed in the cluster
func (r *KindContainerRuntime) isFluxInstalled() (bool, error) {
	// Check if flux-system namespace exists
	if err := r.KubernetesClient.Get("namespace", "flux-system", ""); err != nil {
		return false, nil
	}

	// Check if source-controller deployment exists
	if err := r.KubernetesClient.Get("deployment", "source-controller", "flux-system"); err != nil {
		return false, nil
	}

	return true, nil
}

// installFluxToCluster installs Flux into the cluster
// This function is idempotent - it can be called multiple times safely
func (r *KindContainerRuntime) installFluxToCluster() error {
	// Check if Flux is already installed
	installed, err := r.isFluxInstalled()
	if err != nil {
		return fmt.Errorf("failed to check flux installation: %w", err)
	}

	if installed {
		fmt.Println("Flux already installed")
		return nil
	}

	fmt.Println("Installing Flux with source-controller, helm-controller, and kustomize-controller...")

	components := []string{
		"source-controller",
		"helm-controller",
		"kustomize-controller",
	}

	if err := r.FluxClient.Install(components); err != nil {
		return err
	}

	return nil
}

// waitForFluxControllers waits for all Flux controllers to be ready
func (r *KindContainerRuntime) waitForFluxControllers() error {
	fmt.Println("Waiting for Flux controllers to be ready...")

	controllers := []string{
		"source-controller",
		"helm-controller",
		"kustomize-controller",
	}

	timeout := 1 * time.Minute
	deadline := time.Now().Add(timeout)

	for _, controller := range controllers {
		fmt.Printf("Waiting for %s...\n", controller)

		for {
			if time.Now().After(deadline) {
				return fmt.Errorf("timeout waiting for %s to be ready", controller)
			}

			// Check deployment status
			output, err := r.KubernetesClient.GetWithJSONPath("deployment", controller,
				"flux-system",
				"{.status.conditions[?(@.type=='Available')].status}")

			if err == nil && strings.TrimSpace(output) == "True" {
				fmt.Printf("✓ %s is ready\n", controller)
				break
			}

			time.Sleep(500 * time.Millisecond)
		}
	}

	fmt.Println("✓ All Flux controllers are ready")
	return nil
}

// areTraefikCRDsInstalled checks if Traefik CRDs are available in the cluster
func (r *KindContainerRuntime) areTraefikCRDsInstalled() (bool, error) {
	// Check for the IngressRoute CRD, which is used by testserver
	exists, err := r.KubernetesClient.CRDExists("ingressroutes.traefik.io")
	if err != nil {
		return false, fmt.Errorf("failed to check for traefik CRD: %w", err)
	}
	return exists, nil
}

func (r *KindContainerRuntime) reconcileBaseInfra() error {
	// First check if Traefik CRDs are already installed, if they are
	// the cluster was probably already running and we can just skip
	installed, err := r.areTraefikCRDsInstalled()
	if err != nil {
		return err
	}

	if installed {
		fmt.Println("Base infrastructure already running, skipping")
		return nil
	}

	fmt.Println("Reconciling traefik-crds (blocking)...")

	// Reconcile traefik-crds synchronously (blocking) to ensure CRDs are installed
	time.Sleep(1 * time.Second)
	syncOpts := flux.DefaultReconcileOptions()
	if err := r.FluxClient.ReconcileHelmRelease("traefik-crds", "traefik", true, syncOpts); err != nil {
		return fmt.Errorf("failed to reconcile traefik-crds: %w", err)
	}

	fmt.Println("✓ Traefik CRDs reconciled")
	fmt.Println("Reconciling other base infra (async)...")

	// Reconcile traefik asynchronously (non-blocking) since it has disableWait: true in the manifest
	asyncOpts := flux.ReconcileOptions{
		ShouldWait: false,
		Timeout:    0,
	}
	if err := r.FluxClient.ReconcileHelmRelease("linkerd-crds", "linkerd", true, asyncOpts); err != nil {
		return fmt.Errorf("failed to trigger async linkerd-crds reconcile: %w", err)
	}
	if err := r.FluxClient.ReconcileHelmRelease("linkerd-control-plane", "linkerd", true, asyncOpts); err != nil {
		return fmt.Errorf("failed to trigger async linkerd-control-plane reconcile: %w", err)
	}
	if err := r.FluxClient.ReconcileHelmRelease("traefik", "traefik", true, asyncOpts); err != nil {
		return fmt.Errorf("failed to trigger async traefik reconcile: %w", err)
	}

	fmt.Println("✓ Base infra reconciliation triggered (running in background)")

	return nil
}

// applyBaseInfrastructure deploys all base infrastructure components using Flux
// This includes:
// - Linkerd namespace and certificate secret
// - HelmRepositories for: metrics-server, traefik, linkerd-edge, altinn-studio
// - HelmReleases for: metrics-server, traefik, linkerd-crds, linkerd-control-plane, pdf-generator
func (r *KindContainerRuntime) applyBaseInfrastructure() error {
	fmt.Println("Applying base infrastructure manifest...")
	manifest := r.buildBaseInfrastructureManifest()
	if _, err := r.KubernetesClient.ApplyManifest(manifest); err != nil {
		return fmt.Errorf("failed to apply base infrastructure: %w", err)
	}
	fmt.Println("✓ Base infrastructure manifest applied")

	return nil
}

// buildBaseInfrastructureManifest creates a manifest with all base infrastructure resources
// It substitutes certificate placeholders with actual certificate data
func (r *KindContainerRuntime) buildBaseInfrastructureManifest() string {
	manifest := string(baseInfrastructureManifest)

	// Replace certificate placeholders with indented cert data
	// Each line needs 4 spaces to match the YAML indentation level
	manifest = strings.ReplaceAll(manifest, "    {{CA_CRT}}", indentLines(string(certCACrt), 4))
	manifest = strings.ReplaceAll(manifest, "    {{ISSUER_CRT}}", indentLines(string(certIssuerCrt), 4))
	manifest = strings.ReplaceAll(manifest, "    {{ISSUER_KEY}}", indentLines(string(certIssuerKey), 4))

	return manifest
}

// indentLines indents each line of a multi-line string by the specified number of spaces
func indentLines(s string, spaces int) string {
	if s == "" {
		return s
	}
	indent := strings.Repeat(" ", spaces)
	lines := strings.Split(strings.TrimRight(s, "\n"), "\n")
	for i := range lines {
		lines[i] = indent + lines[i]
	}
	return strings.Join(lines, "\n")
}
