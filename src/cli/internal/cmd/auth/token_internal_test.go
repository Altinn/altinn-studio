package auth

import (
	"errors"
	"testing"

	authstore "altinn.studio/studioctl/internal/auth"
	"altinn.studio/studioctl/internal/config"
)

func TestTokenReturnsStoredAPIKeyEvenWhenExpired(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	creds := &authstore.Credentials{}
	creds.Set("prod", authstore.EnvCredentials{
		Host:      testStudioHost,
		ApiKey:    "stored-key",
		ExpiresAt: "2000-01-01T00:00:00Z",
		Username:  "user",
	})
	if err := authstore.SaveCredentials(home, creds); err != nil {
		t.Fatalf("save credentials: %v", err)
	}

	token, err := NewService(&config.Config{Home: home}).Token("prod")
	if err != nil {
		t.Fatalf("Token() error = %v", err)
	}
	if token != "stored-key" {
		t.Fatalf("Token() = %q, want stored-key", token)
	}
}

func TestTokenNotLoggedIn(t *testing.T) {
	t.Parallel()

	home := t.TempDir()
	creds := &authstore.Credentials{}
	creds.Set("dev", authstore.EnvCredentials{Host: "dev.altinn.studio", ApiKey: "", Username: "user"})
	if err := authstore.SaveCredentials(home, creds); err != nil {
		t.Fatalf("save credentials: %v", err)
	}
	service := NewService(&config.Config{Home: home})

	for _, env := range []string{"prod", "dev"} {
		if _, err := service.Token(env); !errors.Is(err, ErrNotLoggedIn) {
			t.Errorf("Token(%q) error = %v, want ErrNotLoggedIn", env, err)
		}
	}
}
