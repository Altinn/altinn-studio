package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"
)

const (
	loginStateBytes              = 24
	loginCodeVerifierBytes       = 48
	loginCallbackHeaderTimeout   = 5 * time.Second
	loginCallbackShutdownTimeout = 2 * time.Second
	loginCallbackSuccessHTML     = "<!doctype html><title>studioctl login</title><p>Login complete. You can close this window.</p>"
	loginCallbackCancelledHTML   = "<!doctype html><title>studioctl login</title><p>Login cancelled. You can close this window.</p>"
)

// ErrLoginCancelled indicates that the browser login was cancelled by the user.
var ErrLoginCancelled = errors.New("login cancelled")

// LoginTarget is the resolved Designer endpoint for an environment.
type LoginTarget struct {
	Scheme string
	Host   string
}

// BrowserLoginResult contains the one-time code returned by Designer and the verifier used for exchange.
type BrowserLoginResult struct {
	Code         string
	CodeVerifier string
}

// BrowserLoginSession is an active localhost callback listener for browser login.
type BrowserLoginSession struct {
	listener     net.Listener
	server       *http.Server
	codeCh       chan string
	errCh        chan error
	LoginURL     string
	codeVerifier string
}

// StartBrowserLogin starts a localhost callback server and returns the URL to open in the browser.
func (s *Service) StartBrowserLogin(ctx context.Context, env string, target LoginTarget) (*BrowserLoginSession, error) {
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(ctx, "tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("start login callback server: %w", err)
	}

	state, err := randomBase64URL(loginStateBytes)
	if err != nil {
		closeListener(listener)
		return nil, fmt.Errorf("generate login state: %w", err)
	}
	codeVerifier, err := randomBase64URL(loginCodeVerifierBytes)
	if err != nil {
		closeListener(listener)
		return nil, fmt.Errorf("generate code verifier: %w", err)
	}
	codeChallenge := createCodeChallenge(codeVerifier)

	codeCh := make(chan string, 1)
	errCh := make(chan error, 1)
	var server http.Server
	server.ReadHeaderTimeout = loginCallbackHeaderTimeout
	server.Handler = loginCallbackHandler(state, codeCh, errCh)

	go func() {
		if serveErr := server.Serve(listener); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			errCh <- fmt.Errorf("serve login callback: %w", serveErr)
		}
	}()

	callbackURL := "http://" + listener.Addr().String() + "/callback"
	return &BrowserLoginSession{
		LoginURL: buildStudioctlLoginURL(
			target.Scheme,
			target.Host,
			callbackURL,
			state,
			codeChallenge,
			env,
		),
		codeVerifier: codeVerifier,
		listener:     listener,
		server:       &server,
		codeCh:       codeCh,
		errCh:        errCh,
	}, nil
}

// Wait waits for the browser callback to complete.
func (s *BrowserLoginSession) Wait(ctx context.Context) (BrowserLoginResult, error) {
	select {
	case code := <-s.codeCh:
		return BrowserLoginResult{Code: code, CodeVerifier: s.codeVerifier}, nil
	case err := <-s.errCh:
		return BrowserLoginResult{}, err
	case <-ctx.Done():
		return BrowserLoginResult{}, fmt.Errorf("login cancelled: %w", ctx.Err())
	}
}

// Close shuts down the callback server.
func (s *BrowserLoginSession) Close(ctx context.Context) error {
	shutdownCtx, cancel := context.WithTimeout(ctx, loginCallbackShutdownTimeout)
	defer cancel()
	if err := s.server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		closeListener(s.listener)
		return fmt.Errorf("shutdown login callback server: %w", err)
	}
	return nil
}

func loginCallbackHandler(state string, codeCh chan<- string, errCh chan<- error) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/callback" {
			http.NotFound(w, r)
			return
		}
		if got := r.URL.Query().Get("state"); got != state {
			http.Error(w, "Invalid login state.", http.StatusBadRequest)
			errCh <- ErrInvalidToken
			return
		}
		if errorCode := r.URL.Query().Get("error"); errorCode != "" {
			if errorCode == "access_denied" {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				if _, err := w.Write([]byte(loginCallbackCancelledHTML)); err != nil {
					errCh <- fmt.Errorf("write login response: %w", err)
					return
				}
				errCh <- ErrLoginCancelled
				return
			}
			http.Error(w, "Login failed.", http.StatusBadRequest)
			errCh <- ErrInvalidToken
			return
		}
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing login code.", http.StatusBadRequest)
			errCh <- ErrLoginCodeRequired
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if _, err := w.Write([]byte(loginCallbackSuccessHTML)); err != nil {
			errCh <- fmt.Errorf("write login response: %w", err)
			return
		}
		codeCh <- code
	})
}

func buildStudioctlLoginURL(scheme, host, callbackURL, state, codeChallenge, env string) string {
	authorizeValues := url.Values{}
	authorizeValues.Set("redirect_uri", callbackURL)
	authorizeValues.Set("state", state)
	authorizeValues.Set("code_challenge", codeChallenge)
	authorizeValues.Set("client_name", "studioctl "+env)

	authorizePath := "/designer/api/v1/studioctl/auth/authorize?" + authorizeValues.Encode()
	loginValues := url.Values{}
	loginValues.Set("redirect_to", authorizePath)

	return scheme + "://" + host + "/Login?" + loginValues.Encode()
}

func randomBase64URL(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func createCodeChallenge(codeVerifier string) string {
	sum := sha256.Sum256([]byte(codeVerifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func closeListener(listener net.Listener) {
	if err := listener.Close(); err != nil {
		return
	}
}
