//nolint:goconst,containedctx,err113 // Tests use package-private fakes, fixture contexts, and sentinel fixture errors.
package keyvault

import (
	"context"
	"errors"
	"strings"
	"testing"
)

// stubGetter records how it was called and returns a canned response.
type stubGetter struct {
	value     string
	err       error
	gotCtx    context.Context
	gotSecret string
	calls     int
}

func (s *stubGetter) GetSecret(ctx context.Context, name string) (string, error) {
	s.calls++
	s.gotCtx = ctx
	s.gotSecret = name
	return s.value, s.err
}

func TestLoad_EnvOverridePrefersOverGetter(t *testing.T) {
	getter := &stubGetter{value: "from-kv"}
	l := NewLoader("override-pat", getter, "kv-secret-name")

	val, src, err := l.Load(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "override-pat" {
		t.Errorf("value = %q, want override-pat", val)
	}
	if src != SourceEnv {
		t.Errorf("source = %q, want %q", src, SourceEnv)
	}
	if getter.calls != 0 {
		t.Errorf("getter should not be called when env override is set; got %d calls", getter.calls)
	}
}

func TestLoad_KeyVaultPath(t *testing.T) {
	getter := &stubGetter{value: "from-kv"}
	l := NewLoader("", getter, "gitea-admin-pat")

	val, src, err := l.Load(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if val != "from-kv" {
		t.Errorf("value = %q, want from-kv", val)
	}
	if src != SourceKeyVault {
		t.Errorf("source = %q, want %q", src, SourceKeyVault)
	}
	if getter.gotSecret != "gitea-admin-pat" {
		t.Errorf("getter called with secret %q, want gitea-admin-pat", getter.gotSecret)
	}
}

func TestLoad_NoOverrideNoGetter(t *testing.T) {
	l := NewLoader("", nil, "name")
	_, _, err := l.Load(context.Background())
	if !errors.Is(err, ErrNoSource) {
		t.Errorf("want ErrNoSource, got %v", err)
	}
}

func TestLoad_GetterError(t *testing.T) {
	wantErr := errors.New("kv down")
	getter := &stubGetter{err: wantErr}
	l := NewLoader("", getter, "name")
	_, _, err := l.Load(context.Background())
	if !errors.Is(err, wantErr) {
		t.Errorf("expected wrapped error, got %v", err)
	}
}

func TestLoad_EmptyValueFromKeyVault(t *testing.T) {
	getter := &stubGetter{value: ""}
	l := NewLoader("", getter, "name")
	_, _, err := l.Load(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "empty value") {
		t.Errorf("error should mention empty value; got %v", err)
	}
}

func TestNewAzureGetter_RejectsEmptyVaultName(t *testing.T) {
	_, err := NewAzureGetter("")
	if err == nil {
		t.Fatal("expected error for empty vault name, got nil")
	}
}
