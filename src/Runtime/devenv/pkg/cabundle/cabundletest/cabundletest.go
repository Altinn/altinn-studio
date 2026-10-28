// Package cabundletest makes CA bundles for tests of code that reads STUDIO_CA_BUNDLE.
package cabundletest

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"os"
	"path/filepath"
	"testing"
	"time"
)

const filePerm = 0o600

// PEM returns a PEM bundle holding one self-signed CA certificate.
func PEM(tb testing.TB) []byte {
	tb.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		tb.Fatalf("generate CA key: %v", err)
	}
	template := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: "cabundletest CA"},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		KeyUsage:              x509.KeyUsageCertSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		tb.Fatalf("create CA certificate: %v", err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

// WriteFile writes PEM's bundle to a file in a temporary directory and returns its path.
func WriteFile(tb testing.TB) string {
	tb.Helper()
	path := filepath.Join(tb.TempDir(), "ca-bundle.pem")
	if err := os.WriteFile(path, PEM(tb), filePerm); err != nil {
		tb.Fatalf("write CA bundle: %v", err)
	}
	return path
}
