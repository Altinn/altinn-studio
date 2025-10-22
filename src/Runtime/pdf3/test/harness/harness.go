package harness

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"altinn.studio/pdf3/internal/assert"
	ptesting "altinn.studio/pdf3/internal/testing"
	"altinn.studio/pdf3/internal/types"
	"altinn.studio/runtime-fixture/pkg/checksum"
	"altinn.studio/runtime-fixture/pkg/flux"
	"altinn.studio/runtime-fixture/pkg/runtimes/kind"
)

var IsCI bool = os.Getenv("CI") != ""

var (
	TestServerURL string
	JumpboxURL    string
	Runtime       *kind.KindContainerRuntime
	cachePath     = ".cache"
)

// logDuration logs the duration of an operation
// Usage: defer logDuration("Operation name", time.Now())
func logDuration(stepName string, start time.Time) {
	fmt.Printf("  [%s took %s]\n", stepName, time.Since(start))
}

func Init() {
	TestServerURL = "http://testserver.default.svc.cluster.local"
	JumpboxURL = "http://localhost:8020"

	fmt.Println("=== Initializing Test Harness ===")

	var err error
	projectRoot, err := FindProjectRoot()
	if err != nil {
		fmt.Printf("Couldn't find project root: %v", err)
		os.Exit(1)
	}
	Runtime, err = kind.LoadCurrent(filepath.Join(projectRoot, cachePath))
	if err != nil {
		fmt.Printf("Error loading runtime: %v", err)
		os.Exit(1)
	}

	// Wait for services to be ready
	fmt.Println("Waiting for services to be ready...")
	if err := WaitForServices(); err != nil {
		fmt.Fprintf(os.Stderr, "Services not ready: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("=== Test Harness Ready ===")
}

// WaitForServices waits for proxy and test server to be ready
func WaitForServices() error {
	client := &http.Client{Timeout: 2 * time.Second}
	timeout := 40 * time.Second
	deadline := time.Now().Add(timeout)

	// Wait for proxy
	for {
		if time.Now().After(deadline) {
			return fmt.Errorf("timed out waiting for proxy to get ready")
		}

		req, err := http.NewRequest("GET", JumpboxURL+"/health/startup", nil)
		if err != nil {
			return err
		}
		req.Host = "pdf3-proxy.runtime-pdf3.svc.cluster.local"

		resp, err := client.Do(req)
		if err == nil {
			// Close response body when err is nil - we're in a retry loop, so ignoring error is acceptable
			if resp.StatusCode == http.StatusOK {
				_ = resp.Body.Close()
				break
			}
			_ = resp.Body.Close()
		}

		time.Sleep(500 * time.Millisecond)
	}

	return nil
}

func GetDefaultPdfRequest(t *testing.T) *types.PdfRequest {
	parsedUrl, err := url.Parse(TestServerURL + "/app/")
	if err != nil {
		t.Fatalf("Couldnt parse PDF request url: %v", err)
	}

	return &types.PdfRequest{
		URL:                  parsedUrl.String(),
		WaitFor:              types.NewWaitForString("#readyForPrint"),
		SetJavaScriptEnabled: true,
		Options: types.PdfOptions{
			HeaderTemplate:      "<div/>",
			FooterTemplate:      "<div/>",
			DisplayHeaderFooter: false,
			PrintBackground:     true,
			Format:              "A4",
			Margin: types.PdfMargin{
				Top:    "0.75in",
				Left:   "0.75in",
				Bottom: "0.75in",
				Right:  "0.75in",
			},
		},
		Cookies: []types.Cookie{
			{
				Name:     "AltinnStudioRuntime",
				Value:    "for-testing-purposes",
				Domain:   parsedUrl.Hostname(),
				SameSite: "Lax",
			},
		},
	}
}

type PdfResponse struct {
	Data     []byte
	Input    *ptesting.PdfInternalsTestInput
	WorkerIP string // Worker IP that generated this PDF (for routing test output requests)
}

// LoadOutput fetches the test output from the API if testInput was provided
func (r *PdfResponse) LoadOutput(t *testing.T) (*ptesting.PdfInternalsTestOutput, error) {
	if r.Input == nil || r.Input.ID == "" {
		return nil, nil // No test input, nothing to load
	}

	output, err := getTestOutput(t, r.Input.ID, r.WorkerIP)
	if err != nil {
		return nil, err
	}

	return output, nil
}

// getTestOutput fetches a test output from the proxy by ID (which forwards to worker)
func getTestOutput(_ *testing.T, id string, workerIP string) (*ptesting.PdfInternalsTestOutput, error) {
	assert.Assert(id != "")
	assert.Assert(workerIP != "")
	url := JumpboxURL + "/testoutput/" + id

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	httpReq.Host = "pdf3-proxy.runtime-pdf3.svc.cluster.local"
	httpReq.Header.Set("X-Target-Worker-IP", workerIP)

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var output ptesting.PdfInternalsTestOutput
	if err := json.Unmarshal(data, &output); err != nil {
		return nil, fmt.Errorf("failed to unmarshal test output: %w", err)
	}

	return &output, nil
}

// requestNewPDF sends a PDF generation request to the new PDF generator solution
func RequestNewPDF(t *testing.T, req *types.PdfRequest) (*PdfResponse, error) {
	return RequestPDFWithHost(t, req, "pdf3-proxy.runtime-pdf3.svc.cluster.local", nil)
}

// requestNewPDF sends a PDF generation request to the new PDF generator solution
func RequestNewPDFWithTestInput(t *testing.T, req *types.PdfRequest, testInput *ptesting.PdfInternalsTestInput) (*PdfResponse, error) {
	return RequestPDFWithHost(t, req, "pdf3-proxy.runtime-pdf3.svc.cluster.local", testInput)
}

// requestOldPDF sends a PDF generation request to the old PDF generator solution
func RequestOldPDF(t *testing.T, req *types.PdfRequest) (*PdfResponse, error) {
	return RequestPDFWithHost(t, req, "pdf-generator.pdf.svc.cluster.local", nil)
}

// requestPDF sends a PDF generation request to the proxy
func RequestPDFWithHost(t *testing.T, req *types.PdfRequest, overrideHost string, testInput *ptesting.PdfInternalsTestInput) (*PdfResponse, error) {
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := JumpboxURL + "/pdf"

	// Create HTTP client with 30s timeout for PDF generation
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewReader((reqBody)))
	if err != nil {
		return nil, err
	}
	httpReq.Host = overrideHost
	httpReq.Header.Set("Content-Type", "application/json")
	if strings.Contains(overrideHost, "pdf3") {
		if testInput == nil {
			testInput = ptesting.NewDefaultTestInput()
		}
		testInput.Serialize(httpReq.Header)
	}

	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer func() {
		// Closing response body after reading PDF data
		_ = resp.Body.Close()
	}()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status code %d: %s", resp.StatusCode, string(body))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	if !IsPDF(data) {
		t.Error("Response is not a valid PDF")
	}

	// In test internals mode, capture the worker IP for routing test output requests
	workerIP := ""
	if testInput != nil {
		workerIP = resp.Header.Get("X-Worker-IP")
		if workerIP == "" {
			t.Fatal("Warning: X-Worker-IP header not present in response")
		}
	}

	return &PdfResponse{
		Data:     data,
		Input:    testInput,
		WorkerIP: workerIP,
	}, nil
}

var projectRoot string

// FindProjectRoot searches upward for a directory containing go.mod
// It starts from the current working directory and checks up to maxIterations parent directories
func FindProjectRoot() (string, error) {
	if projectRoot != "" {
		return projectRoot, nil
	}

	const maxIterations = 10

	// Get current working directory
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Track the previous directory to detect when we've reached the filesystem root
	prevDir := ""

	for i := 0; i < maxIterations; i++ {
		// Check if go.mod exists in current directory
		goModPath := filepath.Join(dir, "go.mod")
		if _, err := os.Stat(goModPath); err == nil {
			projectRoot = dir
			return dir, nil
		}

		// Move to parent directory
		parentDir := filepath.Dir(dir)

		// Check if we've reached the filesystem root (dir == parentDir on Unix, or checking against previous)
		if parentDir == dir || parentDir == prevDir {
			return "", errors.New("reached filesystem root without finding go.mod")
		}

		prevDir = dir
		dir = parentDir
	}

	return "", errors.New("exceeded maximum iterations searching for go.mod")
}

// SetupCluster starts the Kind container runtime with all dependencies
func SetupCluster(variant kind.KindContainerRuntimeVariant, registryStartedEvent chan<- struct{}) (*kind.KindContainerRuntime, error) {
	fmt.Println("=== Setting up Kind cluster ===")
	overallStart := time.Now()

	// Find project root to resolve relative paths
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return nil, fmt.Errorf("failed to find project root: %w", err)
	}

	// Create absolute cache path
	absoluteCachePath := filepath.Join(projectRoot, cachePath)

	// Create Kind container runtime
	Runtime, err = kind.New(variant, absoluteCachePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create kind runtime: %w", err)
	}
	Runtime.RegistryStartedEvent = registryStartedEvent

	// Run the runtime (idempotent)
	start := time.Now()
	if err := Runtime.Run(); err != nil {
		return nil, fmt.Errorf("failed to run kind runtime: %w", err)
	}
	logDuration("Run Kind runtime", start)

	fmt.Println("✓ Kind cluster ready")
	logDuration("Setup Kind cluster (total)", overallStart)
	return Runtime, nil
}

// BuildAndPushImages builds Docker images and pushes them to the local registry
// Returns true if images were rebuilt, false if skipped due to no changes
func BuildAndPushImages() (bool, error) {
	fmt.Println("=== Building and pushing Docker images ===")
	overallStart := time.Now()

	// Find project root
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return false, fmt.Errorf("failed to find project root: %w", err)
	}

	// Compute checksum of all files that affect the Docker build
	fmt.Println("Checking for changes in source code...")
	patterns := []string{
		"cmd/**/*.go",
		"internal/**/*.go",
		"go.mod",
		"go.sum",
		"Dockerfile.proxy",
		"Dockerfile.worker",
	}
	currentHash, err := checksum.ComputeFilesChecksum(projectRoot, patterns)
	if err != nil {
		return false, fmt.Errorf("failed to compute checksum: %w", err)
	}

	// Check cached checksum
	cachedHash, err := readCachedChecksum(projectRoot, "docker-images")
	if err != nil {
		return false, fmt.Errorf("failed to read cached checksum: %w", err)
	}

	if cachedHash == currentHash {
		fmt.Println("No source changes detected, skipping image rebuild")
		logDuration("Build and push images (skipped)", overallStart)
		return false, nil
	}

	fmt.Println("Source changes detected, rebuilding images...")

	// Build proxy image
	fmt.Println("Building proxy image...")
	start := time.Now()
	if err := Runtime.ContainerClient.Build(projectRoot, "Dockerfile.proxy", "localhost:5001/runtime-pdf3-proxy:latest"); err != nil {
		return false, err
	}
	logDuration("Build proxy image", start)

	// Build worker image
	fmt.Println("Building worker image...")
	start = time.Now()
	if err := Runtime.ContainerClient.Build(projectRoot, "Dockerfile.worker", "localhost:5001/runtime-pdf3-worker:latest"); err != nil {
		return false, err
	}
	logDuration("Build worker image", start)

	// Push images to registry
	fmt.Println("Pushing images to registry...")
	start = time.Now()

	// Push proxy image
	if err := Runtime.ContainerClient.Push("localhost:5001/runtime-pdf3-proxy:latest"); err != nil {
		return false, err
	}

	// Push worker image
	if err := Runtime.ContainerClient.Push("localhost:5001/runtime-pdf3-worker:latest"); err != nil {
		return false, err
	}
	logDuration("Push images to registry", start)

	// Update cached checksum
	if err := writeCachedChecksum(projectRoot, "docker-images", currentHash); err != nil {
		return false, fmt.Errorf("failed to write cached checksum: %w", err)
	}

	fmt.Println("✓ Images built and pushed")
	logDuration("Build and push images (total)", overallStart)
	return true, nil
}

// PushKustomizeArtifact pushes the kustomize directory as an OCI artifact
// Returns true if artifact was pushed, false if skipped due to no changes
func PushKustomizeArtifact() (bool, error) {
	fmt.Println("=== Pushing kustomize artifact ===")
	overallStart := time.Now()

	// Find project root
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return false, fmt.Errorf("failed to find project root: %w", err)
	}

	// Compute checksum of all kustomize files
	fmt.Println("Checking for changes in kustomize configuration...")
	patterns := []string{
		"infra/kustomize/**/*.yaml",
		"infra/kustomize/**/*.yml",
	}
	currentHash, err := checksum.ComputeFilesChecksum(projectRoot, patterns)
	if err != nil {
		return false, fmt.Errorf("failed to compute checksum: %w", err)
	}

	// Check cached checksum
	cachedHash, err := readCachedChecksum(projectRoot, "kustomize")
	if err != nil {
		return false, fmt.Errorf("failed to read cached checksum: %w", err)
	}

	if cachedHash == currentHash {
		fmt.Println("No kustomize changes detected, skipping artifact push")
		logDuration("Push kustomize artifact (skipped)", overallStart)
		return false, nil
	}

	fmt.Println("Kustomize changes detected, pushing artifact...")

	// Push the entire kustomize directory so that local can reference ../base
	kustomizePath := filepath.Join(projectRoot, "infra", "kustomize")

	// Use flux CLI from the cache path (installed by Kind runtime)
	start := time.Now()
	if err := Runtime.FluxClient.PushArtifact(
		"oci://localhost:5001/runtime-pdf3-repo:local",
		kustomizePath,
		"local",
		"local",
	); err != nil {
		return false, err
	}
	logDuration("Push artifact to OCI registry", start)

	// Update cached checksum
	if err := writeCachedChecksum(projectRoot, "kustomize", currentHash); err != nil {
		return false, fmt.Errorf("failed to write cached checksum: %w", err)
	}

	fmt.Println("✓ Kustomize artifact pushed")
	logDuration("Push kustomize artifact (total)", overallStart)
	return true, nil
}

// deploymentsExist checks if both pdf3 deployments exist in the cluster
func deploymentsExist() bool {
	// Check if pdf3-proxy deployment exists
	if err := Runtime.KubernetesClient.Get("deployment", "pdf3-proxy", "runtime-pdf3"); err != nil {
		return false
	}

	// Check if pdf3-worker deployment exists
	if err := Runtime.KubernetesClient.Get("deployment", "pdf3-worker", "runtime-pdf3"); err != nil {
		return false
	}

	return true
}

// DeployPdf3ViaFlux deploys pdf3 using Flux
// Returns true if deployment was performed, false if skipped due to no changes
func DeployPdf3ViaFlux(variant kind.KindContainerRuntimeVariant, imagesChanged, kustomizeChanged bool) (bool, error) {
	fmt.Println("=== Deploying pdf3 via Flux ===")
	overallStart := time.Now()

	// Skip deployment if nothing changed and deployments already exist
	if !imagesChanged && !kustomizeChanged && deploymentsExist() {
		fmt.Println("No changes detected and deployments exist, skipping deployment")
		logDuration("Deploy pdf3 via Flux (skipped)", overallStart)
		return false, nil
	}

	// Find project root
	projectRoot, err := FindProjectRoot()
	if err != nil {
		return false, fmt.Errorf("failed to find project root: %w", err)
	}

	var variantName string
	switch variant {
	case kind.KindContainerRuntimeVariantMinimal:
		variantName = "minimal"
	case kind.KindContainerRuntimeVariantStandard:
		variantName = "standard"
	}

	syncRootDir := filepath.Join(projectRoot, "infra", "kustomize", fmt.Sprintf("local-syncroot-%s", variantName))
	manifest, err := Runtime.KubernetesClient.KustomizeRender(syncRootDir)
	if err != nil {
		return false, err
	}

	// Apply the complete manifest in a single request
	fmt.Println("Applying pdf3 manifest...")
	start := time.Now()
	if _, err := Runtime.KubernetesClient.ApplyManifest(manifest); err != nil {
		return false, fmt.Errorf("failed to apply manifest: %w", err)
	}
	logDuration("Apply pdf3 manifest", start)

	// Default reconcile options (blocking/synchronous)
	reconcileOpts := flux.DefaultReconcileOptions()

	// Trigger immediate reconciliation of Kustomization
	fmt.Println("Triggering Kustomization reconciliation...")
	start = time.Now()
	if err := Runtime.FluxClient.ReconcileKustomization("pdf3-app", "runtime-pdf3", true, reconcileOpts); err != nil {
		return false, fmt.Errorf("failed to reconcile Kustomization: %w", err)
	}
	logDuration("Reconcile Kustomization", start)

	fmt.Println("✓ Flux reconciliation complete")

	// Wait for deployments to be ready
	fmt.Println("Waiting for pdf3-proxy deployment...")
	start = time.Now()
	if err := Runtime.KubernetesClient.RolloutStatus("pdf3-proxy", "runtime-pdf3", 120*time.Second); err != nil {
		return false, fmt.Errorf("failed waiting for pdf3-proxy: %w", err)
	}
	logDuration("Wait for pdf3-proxy deployment", start)

	fmt.Println("Waiting for pdf3-worker deployment...")
	start = time.Now()
	if err := Runtime.KubernetesClient.RolloutStatus("pdf3-worker", "runtime-pdf3", 120*time.Second); err != nil {
		return false, fmt.Errorf("failed waiting for pdf3-worker: %w", err)
	}
	logDuration("Wait for pdf3-worker deployment", start)

	fmt.Println("✓ pdf3 deployed via Flux")
	logDuration("Deploy pdf3 via Flux (total)", overallStart)
	return true, nil
}

// readCachedChecksum reads a cached checksum from .cache/checksums/{name}.txt
func readCachedChecksum(projectRoot, name string) (string, error) {
	checksumPath := filepath.Join(projectRoot, cachePath, "checksums", name+".txt")
	data, err := os.ReadFile(checksumPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil // No cached checksum
		}
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

// writeCachedChecksum writes a checksum to .cache/checksums/{name}.txt
func writeCachedChecksum(projectRoot, name, hash string) error {
	checksumDir := filepath.Join(projectRoot, cachePath, "checksums")
	if err := os.MkdirAll(checksumDir, 0755); err != nil {
		return fmt.Errorf("failed to create checksums directory: %w", err)
	}

	checksumPath := filepath.Join(checksumDir, name+".txt")
	if err := os.WriteFile(checksumPath, []byte(hash), 0644); err != nil {
		return fmt.Errorf("failed to write checksum: %w", err)
	}
	return nil
}
