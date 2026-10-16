// Package auth handles the API keys that callers of a shared pdf3 present, and the relay sends.
//
// Keys are read from a file with one key per line, mounted from a Secret. Lines starting with #
// are comments. The proxy accepts every key in its file; the relay sends the first key in its own.
//
// Kubernetes replaces the mounted file when the Secret changes, so the file is reread when it
// changes and two keys can be valid while a key is rotated. A Secret mounted with subPath is never
// updated, so a change only takes effect when the pod restarts.
//
// src/Runtime/pdf3/docs/api-keys.md describes how to rotate and revoke a key, and what the keys
// protect.
package auth

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	ihttp "altinn.studio/pdf3/internal/http"
	"altinn.studio/pdf3/internal/telemetry/attr"
)

// ReloadInterval is how often Watch checks the key file for changes.
const ReloadInterval = 30 * time.Second

var errNoKeys = errors.New("key file contains no keys")

// KeyFile is a set of API keys read from a file.
type KeyFile struct {
	modTime time.Time
	logger  *slog.Logger
	path    string
	keys    []string
	hashes  [][sha256.Size]byte
	size    int64
	mu      sync.RWMutex
}

// Load reads the keys in path. It fails if the file can't be read or has no keys.
func Load(logger *slog.Logger, path string) (*KeyFile, error) {
	k := &KeyFile{logger: logger, path: path}
	if _, err := k.reload(); err != nil {
		return nil, err
	}
	return k, nil
}

// Valid reports whether token is one of the keys.
func (k *KeyFile) Valid(token string) bool {
	if token == "" {
		return false
	}
	// Comparing hashes keeps the comparison constant time regardless of key length.
	hash := sha256.Sum256([]byte(token))
	k.mu.RLock()
	defer k.mu.RUnlock()
	valid := 0
	for i := range k.hashes {
		valid |= subtle.ConstantTimeCompare(hash[:], k.hashes[i][:])
	}
	return valid == 1
}

// First returns the first key in the file, which is the key a client sends.
func (k *KeyFile) First() string {
	k.mu.RLock()
	defer k.mu.RUnlock()
	return k.keys[0]
}

// Watch rereads the file when it changes, until ctx is done.
// If the file can't be read or has no keys, the current keys are kept.
func (k *KeyFile) Watch(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			changed, err := k.reload()
			if err != nil {
				k.logger.ErrorContext(
					ctx,
					"Failed to reload API keys, keeping current keys",
					attr.APIKeysFile, k.path,
					attr.Error, err,
				)
			} else if changed {
				k.logger.InfoContext(ctx, "Reloaded API keys", attr.APIKeysFile, k.path, attr.APIKeysCount, k.count())
			}
		}
	}
}

func (k *KeyFile) count() int {
	k.mu.RLock()
	defer k.mu.RUnlock()
	return len(k.keys)
}

func (k *KeyFile) reload() (bool, error) {
	info, err := os.Stat(k.path)
	if err != nil {
		return false, fmt.Errorf("stat key file: %w", err)
	}
	k.mu.RLock()
	unchanged := info.ModTime().Equal(k.modTime) && info.Size() == k.size
	k.mu.RUnlock()
	if unchanged {
		return false, nil
	}

	data, err := os.ReadFile(k.path)
	if err != nil {
		return false, fmt.Errorf("read key file: %w", err)
	}
	keys, err := parseKeys(data)
	if err != nil {
		return false, err
	}
	if len(keys) == 0 {
		return false, errNoKeys
	}
	hashes := make([][sha256.Size]byte, len(keys))
	for i, key := range keys {
		hashes[i] = sha256.Sum256([]byte(key))
	}

	k.mu.Lock()
	defer k.mu.Unlock()
	k.keys = keys
	k.hashes = hashes
	k.modTime = info.ModTime()
	k.size = info.Size()
	return true, nil
}

// parseKeys returns the non-empty lines that aren't comments, which start with #.
func parseKeys(data []byte) ([]string, error) {
	var keys []string
	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		keys = append(keys, line)
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("parse key file: %w", err)
	}
	return keys, nil
}

// RequireAPIKey rejects requests without a valid "Authorization: Bearer <key>" header with 401,
// recording the rejection on the request's span.
func RequireAPIKey(logger *slog.Logger, keys *KeyFile, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if keys.Valid(bearerToken(r)) {
			next(w, r)
			return
		}
		trace.SpanFromContext(r.Context()).SetAttributes(
			attribute.String(attr.ResponseRejectionReason, "unauthorized"),
		)
		w.Header().Set("WWW-Authenticate", "Bearer")
		ihttp.WriteProblemDetails(logger, w, r, http.StatusUnauthorized, ihttp.ProblemDetails{
			Type:   "https://tools.ietf.org/html/rfc7235#section-3.1",
			Title:  "Unauthorized",
			Status: http.StatusUnauthorized,
			Detail: "A valid API key is required",
		})
	}
}

func bearerToken(r *http.Request) string {
	scheme, token, found := strings.Cut(r.Header.Get("Authorization"), " ")
	if !found || !strings.EqualFold(scheme, "Bearer") {
		return ""
	}
	return strings.TrimSpace(token)
}
