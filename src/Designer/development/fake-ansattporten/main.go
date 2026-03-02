package main

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"
)

type TestUser struct {
	PID       string `json:"pid"`
	Sub       string `json:"sub"`
	GivenName string `json:"given_name"`
	FamilyName string `json:"family_name"`
}

var testUsers = []TestUser{
	{PID: "29922149761", Sub: "sub-29922149761", GivenName: "Ola", FamilyName: "Nordmann"},
	{PID: "09858398468", Sub: "sub-09858398468", GivenName: "Kari", FamilyName: "Hansen"},
	{PID: "10866898516", Sub: "sub-10866898516", GivenName: "Per", FamilyName: "Olsen"},
	{PID: "15076500565", Sub: "sub-15076500565", GivenName: "Ingrid", FamilyName: "Berg"},
	{PID: "02056260016", Sub: "sub-02056260016", GivenName: "Erik", FamilyName: "Larsen"},
}

type pendingAuth struct {
	userIdx int
	nonce   string
}

// pendingCodes maps authorization codes to the selected user and nonce.
var pendingCodes = map[string]pendingAuth{}

var signingKey *rsa.PrivateKey
const keyID = "fake-ansattporten-key-1"

func main() {
	var err error
	// Use a deterministic seed so the key is stable across restarts.
	// This avoids JWKS cache mismatches when Designer restarts after the fake.
	deterministicReader := sha256DeterministicReader("fake-ansattporten-static-seed")
	signingKey, err = rsa.GenerateKey(deterministicReader, 2048)
	if err != nil {
		log.Fatal("Failed to generate RSA key:", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8443"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/.well-known/openid-configuration", handleDiscovery)
	mux.HandleFunc("/jwks", handleJWKS)
	mux.HandleFunc("/authorize", handleAuthorize)
	mux.HandleFunc("/token", handleToken)
	mux.HandleFunc("/userinfo", handleUserInfo)

	log.Printf("Fake Ansattporten listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func issuer() string {
	if os.Getenv("DEVELOP_BACKEND") != "1" {
		if v := os.Getenv("ISSUER"); v != "" {
			return v
		}
	}
	return "http://localhost:8443"
}

func handleDiscovery(w http.ResponseWriter, _ *http.Request) {
	iss := issuer()
	doc := map[string]any{
		"issuer":                 iss,
		"authorization_endpoint": iss + "/authorize",
		"token_endpoint":         iss + "/token",
		"userinfo_endpoint":      iss + "/userinfo",
		"jwks_uri":               iss + "/jwks",
		"response_types_supported":              []string{"code"},
		"subject_types_supported":               []string{"public"},
		"id_token_signing_alg_values_supported": []string{"RS256"},
		"token_endpoint_auth_methods_supported": []string{"client_secret_basic", "client_secret_post"},
		"scopes_supported":                      []string{"openid", "profile"},
		"claims_supported":                      []string{"sub", "pid", "given_name", "family_name"},
	}
	writeJSON(w, doc)
}

func handleJWKS(w http.ResponseWriter, _ *http.Request) {
	pub := signingKey.PublicKey
	jwks := map[string]any{
		"keys": []map[string]any{
			{
				"kty": "RSA",
				"use": "sig",
				"kid": keyID,
				"alg": "RS256",
				"n":   base64URLEncode(pub.N.Bytes()),
				"e":   base64URLEncode(big.NewInt(int64(pub.E)).Bytes()),
			},
		},
	}
	writeJSON(w, jwks)
}

func handleAuthorize(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		_ = r.ParseForm()
		redirectURI := r.FormValue("redirect_uri")
		state := r.FormValue("state")
		nonce := r.FormValue("nonce")
		userIdx := r.FormValue("user")

		idx := 0
		for i, u := range testUsers {
			if u.PID == userIdx {
				idx = i
				break
			}
		}

		code := generateCode()
		pendingCodes[code] = pendingAuth{userIdx: idx, nonce: nonce}

		sep := "?"
		if strings.Contains(redirectURI, "?") {
			sep = "&"
		}
		location := fmt.Sprintf("%s%scode=%s&state=%s", redirectURI, sep, code, state)
		http.Redirect(w, r, location, http.StatusFound)
		return
	}

	redirectURI := r.URL.Query().Get("redirect_uri")
	state := r.URL.Query().Get("state")
	nonce := r.URL.Query().Get("nonce")

	data := struct {
		Users       []TestUser
		RedirectURI string
		State       string
		Nonce       string
	}{
		Users:       testUsers,
		RedirectURI: redirectURI,
		State:       state,
		Nonce:       nonce,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	pickerTemplate.Execute(w, data)
}

func handleToken(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	_ = r.ParseForm()

	grantType := r.FormValue("grant_type")

	var ok bool
	var auth pendingAuth

	switch grantType {
	case "refresh_token":
		rt := r.FormValue("refresh_token")
		auth, ok = pendingCodes["refresh:"+rt]
		if !ok {
			http.Error(w, `{"error":"invalid_grant"}`, http.StatusBadRequest)
			return
		}
		delete(pendingCodes, "refresh:"+rt)
	default:
		code := r.FormValue("code")
		auth, ok = pendingCodes[code]
		if !ok {
			http.Error(w, `{"error":"invalid_grant"}`, http.StatusBadRequest)
			return
		}
		delete(pendingCodes, code)
	}

	user := testUsers[auth.userIdx]
	now := time.Now()

	clientID := resolveClientID(r)

	idTokenClaims := map[string]any{
		"iss":         issuer(),
		"sub":         user.Sub,
		"aud":         clientID,
		"exp":         now.Add(time.Hour).Unix(),
		"iat":         now.Unix(),
		"pid":         user.PID,
		"given_name":  user.GivenName,
		"family_name": user.FamilyName,
		"acr":         "substantial",
	}
	if auth.nonce != "" {
		idTokenClaims["nonce"] = auth.nonce
	}

	idToken, err := signJWT(idTokenClaims)
	if err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	accessToken, err := signJWT(map[string]any{
		"iss":  issuer(),
		"sub":  user.Sub,
		"exp":  now.Add(time.Hour).Unix(),
		"iat":  now.Unix(),
		"pid":  user.PID,
		"type": "access_token",
	})
	if err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	refreshToken := generateCode()
	// Store the refresh token mapped to the same user for token refresh support
	pendingCodes["refresh:"+refreshToken] = pendingAuth{userIdx: auth.userIdx}

	resp := map[string]any{
		"access_token":  accessToken,
		"token_type":    "Bearer",
		"expires_in":    3600,
		"id_token":      idToken,
		"refresh_token": refreshToken,
		"scope":         "openid profile",
	}
	writeJSON(w, resp)
}

func handleUserInfo(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	token := strings.TrimPrefix(auth, "Bearer ")

	claims, err := parseJWTClaims(token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	sub, _ := claims["sub"].(string)
	var user *TestUser
	for i := range testUsers {
		if testUsers[i].Sub == sub {
			user = &testUsers[i]
			break
		}
	}
	if user == nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	writeJSON(w, map[string]any{
		"sub":         user.Sub,
		"pid":         user.PID,
		"given_name":  user.GivenName,
		"family_name": user.FamilyName,
	})
}

// sha256DeterministicReader returns an io.Reader that produces a deterministic
// byte stream derived from the seed. Used to generate a stable RSA key.
func sha256DeterministicReader(seed string) *deterministicStream {
	return &deterministicStream{state: []byte(seed)}
}

type deterministicStream struct {
	state []byte
	buf   []byte
}

func (d *deterministicStream) Read(p []byte) (int, error) {
	n := 0
	for n < len(p) {
		if len(d.buf) == 0 {
			h := sha256.Sum256(d.state)
			d.buf = h[:]
			d.state = h[:]
		}
		copied := copy(p[n:], d.buf)
		d.buf = d.buf[copied:]
		n += copied
	}
	return n, nil
}

func resolveClientID(r *http.Request) string {
	if cid := r.FormValue("client_id"); cid != "" {
		return cid
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Basic ") {
		decoded, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(auth, "Basic "))
		if err == nil {
			parts := strings.SplitN(string(decoded), ":", 2)
			if len(parts) >= 1 {
				return parts[0]
			}
		}
	}
	return "unknown"
}

// --- JWT helpers (minimal, no external deps) ---

func signJWT(claims map[string]any) (string, error) {
	header := map[string]string{"alg": "RS256", "typ": "JWT", "kid": keyID}
	headerJSON, _ := json.Marshal(header)
	claimsJSON, _ := json.Marshal(claims)

	payload := base64URLEncode(headerJSON) + "." + base64URLEncode(claimsJSON)

	digest := sha256Sum([]byte(payload))
	sig, err := rsa.SignPKCS1v15(rand.Reader, signingKey, crypto.SHA256, digest)
	if err != nil {
		return "", err
	}

	return payload + "." + base64URLEncode(sig), nil
}

func sha256Sum(data []byte) []byte {
	h := sha256.New()
	h.Write(data)
	return h.Sum(nil)
}

func parseJWTClaims(token string) (map[string]any, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}
	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, err
	}
	var claims map[string]any
	err = json.Unmarshal(claimsJSON, &claims)
	return claims, err
}

func generateCode() string {
	b := make([]byte, 24)
	rand.Read(b)
	return base64URLEncode(b)
}

func base64URLEncode(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func writeJSON(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// --- User picker HTML template ---

var pickerTemplate = template.Must(template.New("picker").Parse(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Fake Ansattporten - Velg bruker</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .card { background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); padding: 32px; max-width: 420px; width: 100%; }
  h1 { font-size: 18px; color: #1a1a2e; margin-bottom: 8px; }
  p.subtitle { font-size: 13px; color: #666; margin-bottom: 24px; }
  .user-btn { display: block; width: 100%; padding: 14px 16px; margin-bottom: 8px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; text-align: left; transition: all 0.15s; }
  .user-btn:hover { border-color: #1a56db; background: #f0f5ff; }
  .user-btn .name { font-size: 15px; font-weight: 600; color: #1a1a2e; }
  .user-btn .pid { font-size: 12px; color: #888; font-family: monospace; margin-top: 2px; }
  .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-top: 12px; }
</style>
</head>
<body>
<div class="card">
  <h1>Fake Ansattporten</h1>
  <p class="subtitle">Velg testbruker for innlogging</p>
  {{range .Users}}
  <form method="POST" style="display:inline">
    <input type="hidden" name="redirect_uri" value="{{$.RedirectURI}}">
    <input type="hidden" name="state" value="{{$.State}}">
    <input type="hidden" name="nonce" value="{{$.Nonce}}">
    <input type="hidden" name="user" value="{{.PID}}">
    <button type="submit" class="user-btn">
      <div class="name">{{.GivenName}} {{.FamilyName}}</div>
      <div class="pid">PID: {{.PID}}</div>
    </button>
  </form>
  {{end}}
  <div class="badge">Testmiljo - ikke ekte innlogging</div>
</div>
</body>
</html>`))
