// Package cabundle centralizes STUDIO_CA_BUNDLE handling for devenv-managed kind clusters.
package cabundle

import (
	"bytes"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	// EnvStudioCABundle is the host environment variable pointing to a complete CA bundle file.
	EnvStudioCABundle = "STUDIO_CA_BUNDLE"
	// EnvVarsKey contains a CSV list of CA env vars managed by this package.
	EnvVarsKey = "STUDIO_CA_ENV_VARS"
	// KubernetesConfigMapName is the shared ConfigMap name used for fixture workloads.
	KubernetesConfigMapName = "devenv-ca-bundle"
	// KubernetesConfigMapKey is the shared ConfigMap key used for fixture workloads.
	KubernetesConfigMapKey = "ca-bundle.pem"
	// KubernetesVolumeName is the shared volume name used for fixture workloads.
	KubernetesVolumeName = "devenv-ca-bundle"
	// ContainerPath is where the host CA bundle is mounted/copied inside kind nodes and cluster pods.
	// Keep this outside generated trust-store directories: update-ca-certificates may replace
	// /etc/ssl/certs entries with symlinks, making repeated registration copy a file onto itself.
	ContainerPath   = "/tmp/studio-ca-bundle.pem"
	trustStorePath  = "/usr/local/share/ca-certificates/studio-ca-bundle.crt"
	redHatTrustPath = "/etc/pki/ca-trust/source/anchors/studio-ca-bundle.crt"
)

// ErrNoCertificate is returned for a STUDIO_CA_BUNDLE file without a usable certificate: one with no PEM CERTIFICATE
// block, such as an empty file or one in another format, or one whose every certificate is malformed or rejected by
// Go's X.509 parser.
var ErrNoCertificate = errors.New("STUDIO_CA_BUNDLE holds no usable certificate")

var (
	pemBegin            = []byte("-----BEGIN ")
	pemBeginCertificate = []byte("-----BEGIN CERTIFICATE-----")
)

var (
	errCABundleNotRegular = errors.New("STUDIO_CA_BUNDLE must point to a regular file")

	envVars = []string{
		"NODE_EXTRA_CA_CERTS",
		"NPM_CONFIG_CAFILE",
		"SSL_CERT_FILE",
		"GIT_SSL_CAINFO",
		"CURL_CA_BUNDLE",
		"REQUESTS_CA_BUNDLE",
	}
)

// Bundle describes the complete host CA bundle configured for devenv cluster provisioning.
type Bundle struct {
	// Data holds the usable certificates of the file at HostPath, as PEM, without the text between them.
	Data          []byte
	HostPath      string
	ContainerPath string
	// Digest is the SHA-256 of Data.
	Digest string
	// Skipped names each certificate of the file that Data leaves out, with the reason, such as
	// "line 120: x509: negative serial number". The caller decides whether to tell the user.
	Skipped []string
}

// FromEnv returns the configured complete CA bundle and whether STUDIO_CA_BUNDLE is set. A set variable that names no
// readable regular file is an error, and so is a file without a usable certificate (ErrNoCertificate). A certificate
// is usable when Go's X.509 parser accepts it. The others are left out of Data and listed in Skipped.
func FromEnv() (*Bundle, bool, error) {
	hostPath := os.Getenv(EnvStudioCABundle)
	if hostPath == "" {
		return nil, false, nil
	}
	absHostPath, err := filepath.Abs(hostPath)
	if err != nil {
		return nil, true, fmt.Errorf("resolve absolute %s path: %w", EnvStudioCABundle, err)
	}
	hostPath = absHostPath

	// #nosec G703 -- STUDIO_CA_BUNDLE is intentionally a user-controlled host path.
	info, err := os.Stat(hostPath)
	if err != nil {
		return nil, true, fmt.Errorf("stat %s: %w", EnvStudioCABundle, err)
	}
	if !info.Mode().IsRegular() {
		return nil, true, fmt.Errorf("%w: %s", errCABundleNotRegular, hostPath)
	}

	// #nosec G304,G703 -- STUDIO_CA_BUNDLE is intentionally a user-controlled host path.
	data, err := os.ReadFile(hostPath)
	if err != nil {
		return nil, true, fmt.Errorf("read %s: %w", EnvStudioCABundle, err)
	}
	certs, skipped := usableCertificates(data)
	if len(certs) == 0 {
		if len(skipped) == 0 {
			return nil, true, fmt.Errorf("%w: %s: no PEM CERTIFICATE block", ErrNoCertificate, hostPath)
		}
		return nil, true, fmt.Errorf("%w: %s: %s, none usable; %s",
			ErrNoCertificate, hostPath, certificateCount(len(skipped)), skipped[0])
	}
	digest := sha256.Sum256(certs)

	return &Bundle{
		Data:          certs,
		HostPath:      hostPath,
		ContainerPath: ContainerPath,
		Digest:        hex.EncodeToString(digest[:]),
		Skipped:       skipped,
	}, true, nil
}

// usableCertificates returns the CERTIFICATE blocks of data that Go's X.509 parser accepts, re-encoded as PEM, and
// why it skipped each other CERTIFICATE block. Other PEM blocks, such as keys, and the text around the blocks, as in
// the comments of a system bundle, are left out without a reason.
func usableCertificates(data []byte) ([]byte, []string) {
	var certs bytes.Buffer
	var skipped []string
	for offset := 0; ; {
		start := bytes.Index(data[offset:], pemBegin)
		if start < 0 {
			return certs.Bytes(), skipped
		}
		start += offset
		// A block ends before the next one begins, so each block is decoded on its own: pem.Decode would pass over
		// a malformed block to the next one without saying so.
		end := bytes.Index(data[start+len(pemBegin):], pemBegin)
		if end < 0 {
			end = len(data)
		} else {
			end += start + len(pemBegin)
		}
		offset = end
		chunk := data[start:end]
		if !bytes.HasPrefix(chunk, pemBeginCertificate) {
			continue
		}
		line := 1 + bytes.Count(data[:start], []byte("\n"))
		block, _ := pem.Decode(chunk)
		if block == nil || block.Type != "CERTIFICATE" {
			skipped = append(skipped, fmt.Sprintf("line %d: malformed PEM block", line))
			continue
		}
		if _, err := x509.ParseCertificate(block.Bytes); err != nil {
			skipped = append(skipped, fmt.Sprintf("line %d: %v", line, err))
			continue
		}
		if err := pem.Encode(&certs, &pem.Block{Type: "CERTIFICATE", Bytes: block.Bytes}); err != nil {
			skipped = append(skipped, fmt.Sprintf("line %d: %v", line, err))
		}
	}
}

func certificateCount(n int) string {
	if n == 1 {
		return "1 certificate"
	}
	return fmt.Sprintf("%d certificates", n)
}

// EnvVars returns the names of environment variables set for CA-aware cluster pods.
func EnvVars() []string {
	vars := make([]string, len(envVars))
	copy(vars, envVars)
	return vars
}

// EnvVarCSV returns the CA environment variable names as a comma-separated string.
func EnvVarCSV() string {
	return strings.Join(envVars, ",")
}

func runtimeEnvVars() []string {
	vars := make([]string, 0, len(envVars)+1)
	vars = append(vars, EnvStudioCABundle)
	vars = append(vars, envVars...)
	return vars
}
