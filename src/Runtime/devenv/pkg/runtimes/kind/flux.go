package kind

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"altinn.studio/devenv/pkg/cabundle"
	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/kubernetes"
	"altinn.studio/devenv/pkg/runtimes/kind/manifests"
)

var errFluxControllerReadyTimeout = errors.New("timeout waiting for flux controller to be ready")

const traefikRolloutTimeout = 2 * time.Minute

func writeKindStdoutln(args ...any) {
	if _, err := fmt.Fprintln(os.Stdout, args...); err != nil {
		return
	}
}

// isFluxInstalled checks if Flux is already installed in the cluster.
func (r *KindContainerRuntime) isFluxInstalled() bool {
	// Check if flux-system namespace exists
	if err := r.KubernetesClient.Get(kubernetes.NamespaceGVR, "flux-system", ""); err != nil {
		return false
	}

	// Check if source-controller deployment exists
	if err := r.KubernetesClient.Get(kubernetes.DeploymentGVR, "source-controller", "flux-system"); err != nil {
		return false
	}

	return true
}

// installFluxToCluster installs Flux into the cluster
// This function is idempotent - it can be called multiple times safely.
func (r *KindContainerRuntime) installFluxToCluster() error {
	// Check if Flux is already installed
	installed := r.isFluxInstalled()
	if installed {
		writeKindStdoutln("Flux already installed")

		if _, configured, err := cabundle.FromEnv(); err != nil {
			return fmt.Errorf("resolve CA bundle: %w", err)
		} else if !configured {
			return nil
		}

		writeKindStdoutln("Refreshing Flux CA bundle configuration...")
	}

	if !installed {
		writeKindStdoutln("Installing Flux controllers...")
	}

	components := []string{
		"source-controller",
		"helm-controller",
		"kustomize-controller",
	}
	if r.options.IncludeFluxNotificationController {
		components = append(components, "notification-controller")
	}

	opts := flux.LocalInstallOptions()
	if err := r.FluxClient.Install(components, opts); err != nil {
		return fmt.Errorf("install flux controllers: %w", err)
	}

	return nil
}

// waitForFluxControllers waits for all Flux controllers to be ready.
func (r *KindContainerRuntime) waitForFluxControllers() error {
	writeKindStdoutln("Waiting for Flux controllers to be ready...")

	controllers := []string{
		"source-controller",
		"helm-controller",
		"kustomize-controller",
	}
	if r.options.IncludeFluxNotificationController {
		controllers = append(controllers, "notification-controller")
	}

	timeout := 1 * time.Minute
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	for _, controller := range controllers {
		writeKindStdoutf("Waiting for %s...\n", controller)

		if err := r.KubernetesClient.WatchCondition(
			ctx,
			kubernetes.DeploymentGVR,
			controller,
			"flux-system",
			"Available",
			"True",
		); err != nil {
			return fmt.Errorf("%w: %s", errFluxControllerReadyTimeout, controller)
		}
		writeKindStdoutf("✓ %s is ready\n", controller)
	}

	writeKindStdoutln("✓ All Flux controllers are ready")
	return nil
}

func (r *KindContainerRuntime) reconcileBaseInfra() error {
	writeKindStdoutln("Reconciling base infra (blocking)...")

	syncOpts := flux.DefaultReconcileOptions()

	if r.options.IncludeLinkerd {
		if err := r.FluxClient.ReconcileHelmRelease("linkerd-crds", "linkerd", true, syncOpts); err != nil {
			return fmt.Errorf("failed to reconcile base infra: %w", err)
		}
	}
	if err := r.FluxClient.ReconcileHelmRelease("traefik-crds", "traefik", true, syncOpts); err != nil {
		return fmt.Errorf("failed to reconcile base infra: %w", err)
	}
	if r.options.IncludeLinkerd {
		if err := r.FluxClient.ReconcileHelmRelease("linkerd-control-plane", "linkerd", true, syncOpts); err != nil {
			return fmt.Errorf("failed to reconcile base infra: %w", err)
		}
	}
	if err := r.FluxClient.ReconcileHelmRelease("traefik", "traefik", true, syncOpts); err != nil {
		return fmt.Errorf("failed to reconcile base infra: %w", err)
	}
	if r.options.IncludeMonitoring {
		_ = r.options.IncludeMonitoring
	}

	if err := r.waitForIngressReady(); err != nil {
		if r.IngressReadyEvent != nil {
			r.IngressReadyEvent <- err
		}
		return err
	}

	writeKindStdoutln("✓ Base infra reconciled")

	if r.IngressReadyEvent != nil {
		r.IngressReadyEvent <- nil
	}

	return nil
}

func (r *KindContainerRuntime) waitForIngressReady() error {
	ctx, cancel := context.WithTimeout(context.Background(), traefikRolloutTimeout)
	defer cancel()

	if err := r.KubernetesClient.WatchCondition(
		ctx,
		flux.HelmReleaseGVR,
		"traefik",
		"traefik",
		"Ready",
		"True",
	); err != nil {
		return fmt.Errorf("error waiting for traefik HelmRelease: %w", err)
	}
	if err := r.KubernetesClient.RolloutStatus("traefik", "traefik", traefikRolloutTimeout); err != nil {
		return fmt.Errorf("error waiting for traefik rollout: %w", err)
	}
	return nil
}

// applyBaseInfrastructure deploys all base infrastructure components using Flux
// This includes:
// - Linkerd namespace and certificate secret
// - HelmRepositories for: metrics-server, traefik, linkerd-edge, altinn-studio
// - HelmReleases for: metrics-server, traefik, linkerd-crds, linkerd-control-plane, pdf-generator.
func (r *KindContainerRuntime) applyBaseInfrastructure() error {
	writeKindStdoutln("Applying base infrastructure manifest...")

	baseObjs := manifests.BuildBaseInfrastructure(certCACrt, certIssuerCrt, certIssuerKey, r.options.IncludeLinkerd)
	if _, err := r.KubernetesClient.ApplyObjects(context.Background(), baseObjs...); err != nil {
		return fmt.Errorf("failed to apply base infrastructure: %w", err)
	}
	writeKindStdoutln("✓ Base infrastructure manifest applied")

	if r.options.IncludeMonitoring {
		_ = r.options.IncludeMonitoring
	}

	return nil
}
