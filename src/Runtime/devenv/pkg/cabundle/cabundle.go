// Package cabundle centralizes STUDIO_CA_BUNDLE handling for devenv-managed kind clusters.
package cabundle

import (
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

// ErrNoCertificate is returned for a STUDIO_CA_BUNDLE file that holds no PEM certificate, such as an empty file or
// one in another format. Trust stores reject or skip such a file, and pdf3's entrypoint does not start with it.
var ErrNoCertificate = errors.New("STUDIO_CA_BUNDLE contains no PEM certificate")

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
//
//nolint:govet // Field order is kept semantic for this small value.
type Bundle struct {
	Data          []byte
	HostPath      string
	ContainerPath string
	Digest        string
}

// FromEnv returns the configured complete CA bundle and whether STUDIO_CA_BUNDLE is set. A set variable that names no
// readable regular file holding at least one PEM certificate is an error (ErrNoCertificate for the last).
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
	if !hasCertificate(data) {
		return nil, true, fmt.Errorf("%w: %s", ErrNoCertificate, hostPath)
	}
	digest := sha256.Sum256(data)

	return &Bundle{
		Data:          data,
		HostPath:      hostPath,
		ContainerPath: ContainerPath,
		Digest:        hex.EncodeToString(digest[:]),
	}, true, nil
}

// hasCertificate reports whether data holds a PEM CERTIFICATE block that parses as an X.509 certificate. Text around
// the blocks, as in the comments of a system bundle, is ignored.
func hasCertificate(data []byte) bool {
	for {
		var block *pem.Block
		block, data = pem.Decode(data)
		if block == nil {
			return false
		}
		if block.Type != "CERTIFICATE" {
			continue
		}
		if _, err := x509.ParseCertificate(block.Bytes); err == nil {
			return true
		}
	}
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
