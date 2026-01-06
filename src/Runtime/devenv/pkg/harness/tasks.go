package harness

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"altinn.studio/devenv/pkg/flux"
	"altinn.studio/devenv/pkg/runtimes/kind"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/config"
	"github.com/go-git/go-git/v5/plumbing"
)

// buildAndPushImage builds a container image and pushes it to the registry
func buildAndPushImage(ctx context.Context, cfg Config, runtime *kind.KindContainerRuntime, img Image) error {
	fmt.Printf("Building image %s...\n", img.Name)
	start := time.Now()

	buildContext := img.Context
	if buildContext == "" {
		buildContext = cfg.ProjectRoot
	} else if !filepath.IsAbs(buildContext) {
		buildContext = filepath.Join(cfg.ProjectRoot, buildContext)
	}

	if err := runtime.ContainerClient.Build(ctx, buildContext, img.Dockerfile, img.Tag); err != nil {
		return fmt.Errorf("failed to build image %s: %w", img.Name, err)
	}
	logDuration(fmt.Sprintf("Built %s", img.Name), start)

	fmt.Printf("Pushing image %s...\n", img.Name)
	start = time.Now()
	if err := runtime.ContainerClient.Push(ctx, img.Tag); err != nil {
		return fmt.Errorf("failed to push image %s: %w", img.Name, err)
	}
	logDuration(fmt.Sprintf("Pushed %s", img.Name), start)

	return nil
}

// pushArtifact pushes an OCI artifact to the registry
func pushArtifact(_ context.Context, cfg Config, runtime *kind.KindContainerRuntime, art Artifact) error {
	fmt.Printf("Pushing artifact %s...\n", art.Name)
	start := time.Now()

	artPath := art.Path
	if !filepath.IsAbs(artPath) {
		artPath = filepath.Join(cfg.ProjectRoot, artPath)
	}

	source := art.Source
	if source == "" {
		source = "local"
	}
	revision := art.Revision
	if revision == "" {
		revision = "local"
	}

	if err := runtime.OCIClient.PushArtifact(art.URL, artPath, source, revision); err != nil {
		return fmt.Errorf("failed to push artifact %s: %w", art.Name, err)
	}

	logDuration(fmt.Sprintf("Pushed artifact %s", art.Name), start)
	return nil
}

// downloadAndPushHelmChart clones a git repo and pushes the helm chart to OCI
func downloadAndPushHelmChart(_ context.Context, cfg Config, runtime *kind.KindContainerRuntime, chart HelmChart) error {
	fmt.Printf("Downloading helm chart %s...\n", chart.Name)
	start := time.Now()

	cachePath := cfg.CachePath
	if cachePath == "" {
		cachePath = ".cache"
	}

	chartsDir := filepath.Join(cfg.ProjectRoot, cachePath, "helm-charts", chart.Name)
	chartPath := filepath.Join(chartsDir, chart.ChartPath)

	// Clone or update repo
	if err := cloneOrUpdateRepo(chartsDir, chart.RepoURL, chart.RepoBranch); err != nil {
		return fmt.Errorf("failed to clone/update repo for %s: %w", chart.Name, err)
	}
	logDuration(fmt.Sprintf("Downloaded %s", chart.Name), start)

	// Package chart
	fmt.Printf("Packaging helm chart %s...\n", chart.Name)
	start = time.Now()

	tmpDir := filepath.Join(cfg.ProjectRoot, cachePath, "helm-packages")
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return fmt.Errorf("failed to create helm packages dir: %w", err)
	}

	chartFile, err := runtime.HelmClient.PackageChart(chartPath, tmpDir)
	if err != nil {
		return fmt.Errorf("failed to package chart %s: %w", chart.Name, err)
	}
	logDuration(fmt.Sprintf("Packaged %s", chart.Name), start)

	// Push to OCI
	fmt.Printf("Pushing helm chart %s to OCI...\n", chart.Name)
	start = time.Now()
	if err := runtime.HelmClient.PushChart(chartFile, chart.OCIRef); err != nil {
		return fmt.Errorf("failed to push chart %s: %w", chart.Name, err)
	}
	logDuration(fmt.Sprintf("Pushed helm chart %s", chart.Name), start)

	// Cleanup
	_ = os.Remove(chartFile)

	return nil
}

func cloneOrUpdateRepo(dir, repoURL, branch string) error {
	refName := plumbing.NewBranchReferenceName(branch)

	repo, err := git.PlainOpen(dir)
	if err != nil {
		// Directory doesn't exist or isn't a repo - clone it
		_, err = git.PlainClone(dir, false, &git.CloneOptions{
			URL:           repoURL,
			ReferenceName: refName,
			SingleBranch:  true,
			Depth:         1,
		})
		if err != nil {
			return fmt.Errorf("git clone failed: %w", err)
		}
		return nil
	}

	// Repo exists - fetch and reset
	refSpec := config.RefSpec("+refs/heads/" + branch + ":refs/remotes/origin/" + branch)
	err = repo.Fetch(&git.FetchOptions{
		RemoteName: "origin",
		RefSpecs:   []config.RefSpec{refSpec},
		Depth:      1,
		Force:      true,
	})
	if err != nil && err != git.NoErrAlreadyUpToDate {
		// Fetch failed - remove and re-clone
		if removeErr := os.RemoveAll(dir); removeErr != nil {
			return fmt.Errorf("failed to remove dir for re-clone: %w (fetch error: %v)", removeErr, err)
		}
		_, err = git.PlainClone(dir, false, &git.CloneOptions{
			URL:           repoURL,
			ReferenceName: refName,
			SingleBranch:  true,
			Depth:         1,
		})
		if err != nil {
			return fmt.Errorf("git clone failed after fetch failure: %w", err)
		}
		return nil
	}

	// Resolve origin/branch reference
	ref, err := repo.Reference(plumbing.NewRemoteReferenceName("origin", branch), true)
	if err != nil {
		return fmt.Errorf("failed to resolve origin/%s: %w", branch, err)
	}

	w, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("failed to get worktree: %w", err)
	}

	err = w.Reset(&git.ResetOptions{
		Commit: ref.Hash(),
		Mode:   git.HardReset,
	})
	if err != nil {
		return fmt.Errorf("git reset failed: %w", err)
	}

	return nil
}

// deployKustomize deploys via Flux Kustomization
func deployKustomize(cfg Config, runtime *kind.KindContainerRuntime, kd *KustomizeDeploy) error {
	syncRootDir := kd.SyncRootDir
	if !filepath.IsAbs(syncRootDir) {
		syncRootDir = filepath.Join(cfg.ProjectRoot, syncRootDir)
	}

	// Render kustomize manifest
	manifest, err := runtime.KubernetesClient.KustomizeRender(syncRootDir)
	if err != nil {
		return fmt.Errorf("failed to render kustomize: %w", err)
	}

	// Apply manifest
	fmt.Println("Applying manifest...")
	if _, err := runtime.KubernetesClient.ApplyManifest(manifest); err != nil {
		return fmt.Errorf("failed to apply manifest: %w", err)
	}

	// Reconcile Kustomization
	fmt.Println("Triggering Kustomization reconciliation...")
	reconcileOpts := flux.DefaultReconcileOptions()
	if kd.ReconcileOpts != nil {
		reconcileOpts = *kd.ReconcileOpts
	}
	if err := runtime.FluxClient.ReconcileKustomization(kd.KustomizationName, kd.Namespace, true, reconcileOpts); err != nil {
		return fmt.Errorf("failed to reconcile Kustomization: %w", err)
	}

	// Wait for rollouts
	for _, rollout := range kd.Rollouts {
		fmt.Printf("Waiting for %s deployment...\n", rollout.Deployment)
		timeout := rollout.Timeout
		if timeout == 0 {
			timeout = 2 * time.Minute
		}
		if err := runtime.KubernetesClient.RolloutStatus(rollout.Deployment, rollout.Namespace, timeout); err != nil {
			return fmt.Errorf("rollout %s failed: %w", rollout.Deployment, err)
		}
	}

	return nil
}

// deployHelm deploys via Flux HelmRelease
func deployHelm(cfg Config, runtime *kind.KindContainerRuntime, hd *HelmDeploy) error {
	manifestPath := hd.ManifestPath
	if !filepath.IsAbs(manifestPath) {
		manifestPath = filepath.Join(cfg.ProjectRoot, manifestPath)
	}

	// Read and apply manifest
	manifest, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read manifest: %w", err)
	}

	fmt.Println("Applying HelmRelease manifest...")
	if _, err := runtime.KubernetesClient.ApplyManifest(string(manifest)); err != nil {
		return fmt.Errorf("failed to apply manifest: %w", err)
	}

	reconcileOpts := flux.DefaultReconcileOptions()
	if hd.ReconcileOpts != nil {
		reconcileOpts = *hd.ReconcileOpts
	}

	// Reconcile HelmRepository first
	if hd.HelmRepositoryName != "" {
		fmt.Println("Triggering HelmRepository reconciliation...")
		if err := runtime.FluxClient.ReconcileHelmRepository(hd.HelmRepositoryName, hd.HelmRepositoryNamespace, reconcileOpts); err != nil {
			return fmt.Errorf("failed to reconcile HelmRepository: %w", err)
		}
	}

	// Reconcile HelmRelease
	fmt.Println("Triggering HelmRelease reconciliation...")
	if err := runtime.FluxClient.ReconcileHelmRelease(hd.HelmReleaseName, hd.HelmReleaseNamespace, false, reconcileOpts); err != nil {
		return fmt.Errorf("failed to reconcile HelmRelease: %w", err)
	}

	// Wait for rollouts
	for _, rollout := range hd.Rollouts {
		fmt.Printf("Waiting for %s deployment...\n", rollout.Deployment)
		timeout := rollout.Timeout
		if timeout == 0 {
			timeout = 2 * time.Minute
		}
		if err := runtime.KubernetesClient.RolloutStatus(rollout.Deployment, rollout.Namespace, timeout); err != nil {
			return fmt.Errorf("rollout %s failed: %w", rollout.Deployment, err)
		}
	}

	return nil
}
