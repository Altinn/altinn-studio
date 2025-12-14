package kind

import (
	"fmt"
	"time"

	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/kubernetes"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind/manifests"
)

// isFluxInstalled checks if Flux is already installed in the cluster
func (r *KindContainerRuntime) isFluxInstalled() (bool, error) {
	// Check if flux-system namespace exists
	if err := r.KubernetesClient.Get(kubernetes.NamespaceGVR, "flux-system", ""); err != nil {
		return false, nil
	}

	// Check if source-controller deployment exists
	if err := r.KubernetesClient.Get(kubernetes.DeploymentGVR, "source-controller", "flux-system"); err != nil {
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

	fmt.Println("Installing Flux controllers...")

	components := []string{
		"source-controller",
		"helm-controller",
		"kustomize-controller",
		"notification-controller",
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
		"notification-controller",
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
			status, err := r.KubernetesClient.GetConditionStatus(kubernetes.DeploymentGVR, controller, "flux-system", "Available")
			if err == nil && status == "True" {
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
		if r.IngressReadyEvent != nil {
			r.IngressReadyEvent <- nil
		}
		return nil
	}

	time.Sleep(1 * time.Second)
	fmt.Println("Reconciling base infra (blocking)...")

	asyncOpts := flux.DefaultReconcileOptions()
	asyncOpts.ShouldWait = false
	syncOpts := flux.DefaultReconcileOptions()

	if err := r.FluxClient.ReconcileHelmRelease("linkerd-crds", "linkerd", true, asyncOpts); err != nil {
		return fmt.Errorf("failed to reconcile base infra: %w", err)
	}
	if err := r.FluxClient.ReconcileHelmRelease("traefik-crds", "traefik", true, asyncOpts); err != nil {
		return fmt.Errorf("failed to reconcile base infra: %w", err)
	}
	if err := r.FluxClient.ReconcileHelmRelease("traefik", "traefik", true, asyncOpts); err != nil {
		return fmt.Errorf("failed to reconcile base infra: %w", err)
	}
	if err := r.FluxClient.ReconcileHelmRelease("linkerd-control-plane", "linkerd", true, syncOpts); err != nil {
		return fmt.Errorf("failed to reconcile base infra: %w", err)
	}
	if r.options.IncludeMonitoring {
		if err := r.FluxClient.ReconcileHelmRelease("kube-prometheus-stack", "monitoring", true, syncOpts); err != nil {
			return fmt.Errorf("failed to reconcile base infra: %w", err)
		}
	}

	fmt.Println("✓ Base infra reconciled")

	if r.IngressReadyEvent != nil {
		go func() {
			var err error
			defer func() { fmt.Printf("Done waiting for ingress. Error=%v\n", err) }()
			deadline := time.Now().Add(2 * time.Minute)

			for !time.Now().After(deadline) {
				err = r.KubernetesClient.Get(kubernetes.DeploymentGVR, "traefik", "traefik")
				if err == nil {
					break
				}
				time.Sleep(250 * time.Millisecond)
			}

			if err != nil {
				r.IngressReadyEvent <- fmt.Errorf("error waiting for ingress deployment: %v", err)
				return
			}

			err = r.KubernetesClient.RolloutStatus("traefik", "traefik", 2*time.Minute)
			if err == nil {
				r.IngressReadyEvent <- nil
			} else {
				r.IngressReadyEvent <- fmt.Errorf("error waiting for ingress readiness: %v", err)
			}
		}()
	}

	return nil
}

// applyBaseInfrastructure deploys all base infrastructure components using Flux
// This includes:
// - Linkerd namespace and certificate secret
// - HelmRepositories for: metrics-server, traefik, linkerd-edge, altinn-studio
// - HelmReleases for: metrics-server, traefik, linkerd-crds, linkerd-control-plane, pdf-generator
func (r *KindContainerRuntime) applyBaseInfrastructure() error {
	fmt.Println("Applying base infrastructure manifest...")

	baseObjs := manifests.BuildBaseInfrastructure(certCACrt, certIssuerCrt, certIssuerKey)
	if _, err := r.KubernetesClient.ApplyObjects(baseObjs...); err != nil {
		return fmt.Errorf("failed to apply base infrastructure: %w", err)
	}
	fmt.Println("✓ Base infrastructure manifest applied")

	if r.options.IncludeMonitoring {
		fmt.Println("Applying monitoring infrastructure manifest...")

		monitoringObjs := manifests.BuildMonitoringInfrastructure()
		if _, err := r.KubernetesClient.ApplyObjects(monitoringObjs...); err != nil {
			return fmt.Errorf("failed to apply monitoring infrastructure: %w", err)
		}
		fmt.Println("✓ Monitoring infrastructure manifest applied")
	}

	return nil
}
