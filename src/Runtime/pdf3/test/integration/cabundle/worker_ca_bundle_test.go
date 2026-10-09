package cabundle

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	"altinn.studio/devenv/pkg/container"
	"altinn.studio/devenv/pkg/projectroot"
	"altinn.studio/pdf3/internal/types"
	"altinn.studio/pdf3/test/harness"
)

const (
	workerImageTag  = "localhost/pdf3-worker:ca-bundle-test"
	fixtureDir      = "/ca-bundle-test"
	assetServerPort = "8443"
	workerPort      = "5031"
	loadedSelector  = "#stylesheet-loaded"
	loadTimeoutMs   = 10000
)

// The pdf3 worker must trust every certificate in STUDIO_CA_BUNDLE, not only the first one: agents use the
// complete system bundle, where the CA for mediated HTTPS is the last entry.
func TestWorkerBrowserTrustsEveryCertificateInCABundle(t *testing.T) {
	dir := t.TempDir()
	writeFixture(t, dir)

	harness.WithContainerClient(t, func(client container.ContainerClient) {
		buildWorkerImage(t, client)
		workerURL := startWorker(t, client, dir)

		pdf := requestPDF(t, workerURL, &types.PdfRequest{
			URL:                  "https://localhost:" + assetServerPort + "/index.html",
			SetJavaScriptEnabled: true,
			WaitFor: types.NewWaitForOptions(types.WaitForOptions{
				Selector: loadedSelector,
				Timeout:  new(int32(loadTimeoutMs)),
			}),
		})
		if !harness.IsPDF(pdf) {
			t.Fatal("Worker response is not a PDF")
		}
	})
}

// writeFixture writes a CA bundle whose second certificate issued the asset server's certificate, and the asset
// server's responses. The page marks itself loaded only after its stylesheet loads over HTTPS.
func writeFixture(t *testing.T, dir string) {
	t.Helper()

	unrelatedCA, _ := newCertificate(t, "Unrelated CA", nil, nil)
	requiredCA, requiredKey := newCertificate(t, "Required CA", nil, nil)
	anotherCA, _ := newCertificate(t, "Another CA", nil, nil)
	server, serverKey := newCertificate(t, "localhost", requiredCA, requiredKey)

	page := `<!doctype html><html><head><link rel="stylesheet" href="/style.css" ` +
		`onload="document.body.insertAdjacentHTML('beforeend', '<p id=stylesheet-loaded>Loaded</p>')">` +
		`</head><body></body></html>`
	files := map[string][]byte{
		"bundle.pem": bytes.Join([][]byte{
			encodeCertificate(unrelatedCA),
			encodeCertificate(requiredCA),
			encodeCertificate(anotherCA),
		}, nil),
		"server.pem": encodeCertificate(server),
		"server.key": encodeKey(t, serverKey),
		"index.html": httpResponse("text/html", page),
		"style.css":  httpResponse("text/css", "body { color: #000; }"),
	}

	// The worker runs as nobody, which must be able to read the fixture.
	if err := os.Chmod(dir, 0o755); err != nil {
		t.Fatalf("Failed to make fixture directory readable: %v", err)
	}
	for name, content := range files {
		if err := os.WriteFile(filepath.Join(dir, name), content, 0o644); err != nil {
			t.Fatalf("Failed to write fixture %s: %v", name, err)
		}
	}
}

func newCertificate(
	t *testing.T,
	commonName string,
	issuer *x509.Certificate,
	issuerKey *ecdsa.PrivateKey,
) (*x509.Certificate, *ecdsa.PrivateKey) {
	t.Helper()

	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate key: %v", err)
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 127))
	if err != nil {
		t.Fatalf("Failed to generate serial number: %v", err)
	}

	template := &x509.Certificate{
		SerialNumber: serial,
		Subject:      pkix.Name{CommonName: commonName},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(24 * time.Hour),
	}
	if issuer == nil {
		template.IsCA = true
		template.BasicConstraintsValid = true
		template.KeyUsage = x509.KeyUsageCertSign | x509.KeyUsageCRLSign
		issuer, issuerKey = template, key
	} else {
		template.DNSNames = []string{commonName}
		template.KeyUsage = x509.KeyUsageDigitalSignature
		template.ExtKeyUsage = []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}
	}

	der, err := x509.CreateCertificate(rand.Reader, template, issuer, &key.PublicKey, issuerKey)
	if err != nil {
		t.Fatalf("Failed to create certificate %s: %v", commonName, err)
	}
	certificate, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("Failed to parse certificate %s: %v", commonName, err)
	}
	return certificate, key
}

func encodeCertificate(certificate *x509.Certificate) []byte {
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certificate.Raw})
}

func encodeKey(t *testing.T, key *ecdsa.PrivateKey) []byte {
	t.Helper()

	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatalf("Failed to encode key: %v", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})
}

// httpResponse builds a complete response for openssl s_server -HTTP, which serves files verbatim.
func httpResponse(contentType, body string) []byte {
	return fmt.Appendf(nil,
		"HTTP/1.0 200 OK\r\nContent-Type: %s\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s",
		contentType, len(body), body,
	)
}

func buildWorkerImage(t *testing.T, client container.ContainerClient) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	projectRoot, err := projectroot.Find(projectroot.Marker)
	if err != nil {
		t.Fatalf("Failed to locate project root: %v", err)
	}
	if err := client.Build(
		ctx,
		projectRoot,
		filepath.Join(projectRoot, "Dockerfile.worker"),
		workerImageTag,
	); err != nil {
		t.Fatalf("Failed to build worker image: %v", err)
	}
}

// startWorker starts the worker image with the fixture's CA bundle, next to an HTTPS asset server, and returns the
// worker's base URL once it is ready.
func startWorker(t *testing.T, client container.ContainerClient, dir string) string {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	hostPort := freePort(t)
	containerID, err := client.CreateContainer(ctx, container.ContainerConfig{
		Name:   fmt.Sprintf("pdf3-worker-ca-bundle-%d", time.Now().UnixNano()),
		Image:  workerImageTag,
		Detach: true,
		Env: []string{
			"PDF3_ENVIRONMENT=local",
			"STUDIO_CA_BUNDLE=" + fixtureDir + "/bundle.pem",
		},
		Volumes: []container.VolumeMount{{HostPath: dir, ContainerPath: fixtureDir, ReadOnly: true}},
		Ports: []container.PortMapping{
			{HostIP: "127.0.0.1", HostPort: strconv.Itoa(hostPort), ContainerPort: workerPort},
		},
		Command: []string{"sh", "-c", fmt.Sprintf(
			"cd %s && openssl s_server -quiet -HTTP -accept %s -cert server.pem -key server.key & exec /app/main",
			fixtureDir, assetServerPort,
		)},
	})
	if err != nil {
		t.Fatalf("Failed to start worker container: %v", err)
	}
	t.Cleanup(func() {
		if t.Failed() {
			logContainerOutput(t, client, containerID)
		}
		if removeErr := client.ContainerRemove(context.Background(), containerID, true); removeErr != nil {
			t.Logf("Failed to remove worker container %s: %v", containerID, removeErr)
		}
	})

	workerURL := "http://127.0.0.1:" + strconv.Itoa(hostPort)
	for {
		if workerReady(t, ctx, workerURL) {
			return workerURL
		}
		select {
		case <-ctx.Done():
			t.Fatalf("Worker did not become ready: %v", ctx.Err())
		case <-time.After(500 * time.Millisecond):
		}
	}
}

func freePort(t *testing.T) int {
	t.Helper()

	listener, err := (&net.ListenConfig{}).Listen(context.Background(), "tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Failed to reserve a port: %v", err)
	}
	addr, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		t.Fatalf("Unexpected listener address %T", listener.Addr())
	}
	if err := listener.Close(); err != nil {
		t.Fatalf("Failed to release reserved port: %v", err)
	}
	return addr.Port
}

func workerReady(t *testing.T, ctx context.Context, workerURL string) bool {
	t.Helper()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, workerURL+"/health/ready", nil)
	if err != nil {
		return false
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	closeBody(t, resp)
	return resp.StatusCode == http.StatusOK
}

// requestPDF sends the request directly to the worker and returns the PDF, failing the test on any other response.
func requestPDF(t *testing.T, workerURL string, pdfRequest *types.PdfRequest) []byte {
	t.Helper()

	body, err := json.Marshal(pdfRequest)
	if err != nil {
		t.Fatalf("Failed to marshal PDF request: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), types.RequestTimeout())
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, workerURL+"/generate", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to create PDF request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Failed to send PDF request: %v", err)
	}
	defer closeBody(t, resp)

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed to read PDF response: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Worker failed to render a page whose stylesheet is served with a bundled CA: status %d: %s",
			resp.StatusCode, data)
	}
	return data
}

func closeBody(t *testing.T, resp *http.Response) {
	t.Helper()

	if err := resp.Body.Close(); err != nil {
		t.Logf("Failed to close response body: %v", err)
	}
}

func logContainerOutput(t *testing.T, client container.ContainerClient, containerID string) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	logs, err := client.ContainerLogs(ctx, containerID, false, "all")
	if err != nil {
		t.Logf("Failed to read worker logs: %v", err)
		return
	}
	defer func() {
		if closeErr := logs.Close(); closeErr != nil {
			t.Logf("Failed to close worker logs: %v", closeErr)
		}
	}()

	output, err := io.ReadAll(logs)
	if err != nil {
		t.Logf("Failed to read worker logs: %v", err)
	}
	t.Logf("Worker logs:\n%s", output)
}
