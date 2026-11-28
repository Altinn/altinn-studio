package signingsecret

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"log/slog"
	"math/big"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
	"software.sslmate.com/src/go-pkcs12"

	"altinn.studio/platform-proxy/internal/accesstoken"
)

func TestLoad(t *testing.T) {
	pfx := newPFX(t)
	clientset := fake.NewClientset(secret(map[string][]byte{Key: pfx}))
	issuer := accesstoken.NewIssuer("ttd")

	if err := newWatcher(clientset, issuer).Load(t.Context()); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !issuer.Ready() {
		t.Fatal("the issuer has no credentials after Load")
	}
	if _, err := issuer.Token(); err != nil {
		t.Errorf("Token(): %v", err)
	}
}

func TestLoadFailures(t *testing.T) {
	tests := map[string]*fake.Clientset{
		"no Secret":    fake.NewClientset(),
		"no key":       fake.NewClientset(secret(map[string][]byte{"other": []byte("x")})),
		"not PKCS #12": fake.NewClientset(secret(map[string][]byte{Key: []byte("not PKCS #12")})),
		"other Secret": fake.NewClientset(otherSecret()),
		"empty":        fake.NewClientset(secret(map[string][]byte{Key: {}})),
	}
	for name, clientset := range tests {
		t.Run(name, func(t *testing.T) {
			issuer := accesstoken.NewIssuer("ttd")
			if err := newWatcher(clientset, issuer).Load(t.Context()); err == nil {
				t.Fatal("Load succeeded")
			}
			if issuer.Ready() {
				t.Error("the issuer has credentials after a failed Load")
			}
		})
	}
}

func TestLoadKeepsCredentialsOnFailure(t *testing.T) {
	clientset := fake.NewClientset(secret(map[string][]byte{Key: newPFX(t)}))
	issuer := accesstoken.NewIssuer("ttd")
	watcher := newWatcher(clientset, issuer)
	if err := watcher.Load(t.Context()); err != nil {
		t.Fatalf("Load: %v", err)
	}

	err := clientset.CoreV1().Secrets(Namespace).Delete(t.Context(), Name, metav1.DeleteOptions{})
	if err != nil {
		t.Fatalf("delete Secret: %v", err)
	}
	if err := watcher.Load(t.Context()); err == nil {
		t.Fatal("Load succeeded without the Secret")
	}
	if !issuer.Ready() {
		t.Error("a failed Load removed the issuer's credentials")
	}
}

func TestLoadPicksUpRotation(t *testing.T) {
	clientset := fake.NewClientset(secret(map[string][]byte{Key: newPFX(t)}))
	issuer := accesstoken.NewIssuer("ttd")
	watcher := newWatcher(clientset, issuer)
	if err := watcher.Load(t.Context()); err != nil {
		t.Fatalf("Load: %v", err)
	}
	firstKeyID := watcher.keyID

	_, err := clientset.CoreV1().Secrets(Namespace).Update(
		t.Context(),
		secret(map[string][]byte{Key: newPFX(t)}),
		metav1.UpdateOptions{},
	)
	if err != nil {
		t.Fatalf("update Secret: %v", err)
	}
	if err := watcher.Load(t.Context()); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if watcher.keyID == firstKeyID {
		t.Error("the watcher kept the old certificate after the Secret changed")
	}
}

func newWatcher(clientset *fake.Clientset, issuer *accesstoken.Issuer) *Watcher {
	return NewWatcher(slog.New(slog.DiscardHandler), clientset.CoreV1(), issuer)
}

func secret(data map[string][]byte) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Namespace: Namespace, Name: Name},
		Data:       data,
	}
}

// otherSecret has the right key, but in another namespace than the apps'.
func otherSecret() *corev1.Secret {
	s := secret(map[string][]byte{Key: []byte("x")})
	s.Namespace = "runtime-platform-proxy"
	return s
}

func newPFX(t *testing.T) []byte {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	template := &x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject:      pkix.Name{CommonName: "ttd"},
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
	}
	der, err := x509.CreateCertificate(rand.Reader, template, template, &key.PublicKey, key)
	if err != nil {
		t.Fatalf("create certificate: %v", err)
	}
	certificate, err := x509.ParseCertificate(der)
	if err != nil {
		t.Fatalf("parse certificate: %v", err)
	}
	pfx, err := pkcs12.Modern2023.Encode(key, certificate, nil, "")
	if err != nil {
		t.Fatalf("encode PKCS #12: %v", err)
	}
	return pfx
}
