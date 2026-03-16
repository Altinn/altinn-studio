// Program that contains fake APIs for Maskinporten self-service API and OAuth authority server
package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"slices"
	"strings"
	"sync"
	"syscall"
	"time"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/fakes"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/orgs"
)

type contextKey string

const StateKey contextKey = "state"

const bodyMaxLen = 200

var logValueSanitizer = strings.NewReplacer("\n", `\n`, "\r", `\r`)

func summarizeBody(body []byte) string {
	if len(body) == 0 {
		return ""
	}
	s := sanitizeForLog(strings.TrimSpace(string(body)))
	if len(s) > bodyMaxLen {
		return " " + s[:bodyMaxLen] + "..."
	}
	return " " + s
}

func sanitizeForLog(value string) string {
	return logValueSanitizer.Replace(value)
}

func stateFromContext(ctx context.Context) *fakes.State {
	state, ok := ctx.Value(StateKey).(*fakes.State)
	assert.That(ok, "State must be present in context")
	assert.That(state != nil, "State must be non-nil")
	return state
}

type responseRecorder struct {
	http.ResponseWriter

	body   bytes.Buffer
	status int
}

func (r *responseRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
	r.body.Write(b)
	n, err := r.ResponseWriter.Write(b)
	if err != nil {
		return n, fmt.Errorf("write response body: %w", err)
	}
	return n, nil
}

func loggingMiddleware(name string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		var reqBody []byte
		if r.Body != nil {
			body, err := io.ReadAll(r.Body)
			if err != nil {
				log.Printf("[%s] couldn't read request body: %v", name, err)
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			reqBody = body
			r.Body = io.NopCloser(bytes.NewReader(reqBody))
		}

		log.Printf(
			"[%s] --> request%s",
			name,
			summarizeBody(reqBody),
		)

		rec := &responseRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		duration := time.Since(start)
		log.Printf(
			"[%s] <-- status=%d duration=%s%s",
			name,
			rec.status,
			duration,
			summarizeBody(rec.body.Bytes()),
		)
	})
}

func main() {
	log.SetOutput(os.Stdout)
	log.Println("Starting server..")
	ctx := setupSignalHandler()
	var wg sync.WaitGroup

	environment := operatorcontext.ResolveEnvironment("")
	monitor := config.GetConfigOrDie(ctx, environment, "")
	_ = operatorcontext.DiscoverOrDie(ctx, environment, nil)

	state := fakes.NewState(monitor.Get())
	ctx = context.WithValue(ctx, StateKey, state)

	wg.Add(3)
	go runMaskinportenApi(ctx, &wg)
	go runSelfServiceApi(ctx, &wg)
	go runOrgRegistryApi(ctx, &wg)

	log.Println("Started server threads")
	wg.Wait()
	log.Println("Shutting down..")
}

type FakeToken struct {
	ClientId string   `json:"client_id"`
	Scopes   []string `json:"scopes"`
}

func serve(ctx context.Context, name string, addr string, registerHandlers func(*http.ServeMux)) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthEndpoint)
	registerHandlers(mux)
	handler := loggingMiddleware(name, mux)
	server := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		BaseContext: func(l net.Listener) context.Context {
			return ctx
		},
	}
	go func() {
		<-ctx.Done()
		if err := server.Close(); err != nil {
			log.Fatalf("[%s] HTTP server close error: %v", name, err)
		}
	}()
	log.Printf("[%s] HTTP server starting: addr=%s\n", name, server.Addr)
	err := server.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		log.Printf("[%s] HTTP server shutting down\n", name)
	} else if err != nil {
		log.Fatalf("[%s] HTTP server error: %v", name, err)
	}
}

func runMaskinportenApi(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	name := "Maskinporten API"
	addr := ":8050"

	state := stateFromContext(ctx)

	serve(ctx, name, addr, func(mux *http.ServeMux) {
		mux.HandleFunc("/token", handleToken(state))
		mux.HandleFunc("/.well-known/oauth-authorization-server", handleWellKnown(state))
	})
}

func handleToken(state *fakes.State) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		assertion, ok := validateTokenRequest(w, r)
		if !ok {
			return
		}

		jwt, err := crypto.ParseJWT(assertion)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			log.Printf("couldn't parse JWT: %v", err)
			return
		}

		keyID := jwt.KeyID()
		if keyID == "" {
			w.WriteHeader(http.StatusBadRequest)
			log.Printf("missing kid")
			return
		}

		client, matchedKey, ok := findClientForKey(state, keyID)
		if !ok {
			w.WriteHeader(http.StatusBadRequest)
			log.Printf("client not found for key")
			return
		}

		claims, err := jwt.DecodeClaims(matchedKey)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			log.Printf("couldn't validate JWT: %v", err)
			return
		}

		requestedScopes, ok := validateTokenClaims(w, state, client, claims)
		if !ok {
			return
		}

		writeTokenResponse(w, client.ClientId, requestedScopes)
	}
}

func validateTokenRequest(w http.ResponseWriter, r *http.Request) (string, bool) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusNotFound)
		return "", false
	}
	if r.URL.Query().Get("grant_type") != "urn:ietf:params:oauth:grant-type:jwt-bearer" {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("invalid grant_type")
		return "", false
	}

	assertion := r.URL.Query().Get("assertion")
	if assertion == "" {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("missing assertion")
		return "", false
	}

	return assertion, true
}

func findClientForKey(state *fakes.State, keyID string) (*fakes.ClientRecord, *crypto.Jwk, bool) {
	clients := state.GetDb().Query(func(record *fakes.ClientRecord) bool {
		return findJWKByKeyID(record, keyID) != nil
	})
	if len(clients) != 1 {
		return nil, nil, false
	}

	client := clients[0]
	matchedKey := findJWKByKeyID(&client, keyID)
	if matchedKey == nil {
		return nil, nil, false
	}

	return &client, matchedKey, true
}

func findJWKByKeyID(record *fakes.ClientRecord, keyID string) *crypto.Jwk {
	if record.Jwks == nil {
		return nil
	}
	for _, jwk := range record.Jwks.Keys {
		if jwk.KeyID() == keyID {
			return jwk
		}
	}
	return nil
}

func validateTokenClaims(
	w http.ResponseWriter,
	state *fakes.State,
	client *fakes.ClientRecord,
	claims *crypto.Claims,
) ([]string, bool) {
	if claims.Issuer == "" {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("missing issuer")
		return nil, false
	}
	if claims.Issuer != client.ClientId {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("invalid issuer")
		return nil, false
	}
	if !slices.Contains(claims.Audience, state.GetExpectedAudience()) {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("invalid audience claim (MP-110)")
		return nil, false
	}
	if claims.Scope == "" {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("missing scope")
		return nil, false
	}

	requestedScopes := strings.Fields(claims.Scope)
	for _, scope := range requestedScopes {
		if !slices.Contains(client.Client.Scopes, scope) {
			w.WriteHeader(http.StatusBadRequest)
			log.Printf("client doesn't have access to requested scope")
			return nil, false
		}
	}

	return requestedScopes, true
}

func writeTokenResponse(w http.ResponseWriter, clientID string, requestedScopes []string) {
	fakeToken := FakeToken{Scopes: requestedScopes, ClientId: clientID}
	tokenJSON, err := json.Marshal(fakeToken)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Printf("couldn't encode scopes: %v", err)
		return
	}

	writeJSON(w, http.StatusOK, maskinporten.TokenResponse{
		AccessToken: base64.StdEncoding.EncodeToString(tokenJSON),
		TokenType:   "Bearer",
		Scope:       strings.Join(requestedScopes, " "),
		ExpiresIn:   120,
	})
}

func handleWellKnown(state *fakes.State) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		issuer := state.GetExpectedAudience()
		baseURL := strings.TrimSuffix(issuer, "/")
		writeJSON(w, http.StatusOK, maskinporten.WellKnownResponse{
			Issuer:                            issuer,
			TokenEndpoint:                     baseURL + "/token",
			JwksURI:                           baseURL + "/jwks",
			TokenEndpointAuthMethodsSupported: []string{"private_key_jwt"},
			GrantTypesSupported:               []string{"urn:ietf:params:oauth:grant-type:jwt-bearer"},
			TokenEndpointAuthSigningAlgValuesSupported: crypto.SignatureAlgorithmsStr,
		})
	}
}

func selfServiceAuth(r *http.Request) *FakeToken {
	if r.Header.Get("Authorization") == "" {
		return nil
	}

	encoded := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if encoded == "" {
		return nil
	}

	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil
	}

	var token FakeToken
	err = json.Unmarshal(decoded, &token)
	if err != nil {
		return nil
	}

	if !slices.Contains(token.Scopes, "idporten:dcr.altinn") {
		return nil
	}

	return &token
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	encoder := json.NewEncoder(w)
	if err := encoder.Encode(payload); err != nil {
		log.Printf("couldn't write response: %v", err)
	}
}

func requireSelfServiceAuth(w http.ResponseWriter, r *http.Request) bool {
	if selfServiceAuth(r) != nil {
		return true
	}

	w.WriteHeader(http.StatusUnauthorized)
	return false
}

func handleTestDump(w http.ResponseWriter, r *http.Request) {
	state := stateFromContext(r.Context())

	writeJSON(w, http.StatusOK, state.GetAll())
}

func handleTestReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	state := stateFromContext(r.Context())

	// Clear all state to ensure deterministic test runs
	state.Reset()

	w.WriteHeader(http.StatusOK)
}

func handleClients(w http.ResponseWriter, r *http.Request) {
	state := stateFromContext(r.Context())

	switch r.Method {
	case http.MethodGet:
		handleClientsGet(state, w, r)
	case http.MethodPost:
		handleClientsPost(state, w, r)

	default:
		if !requireSelfServiceAuth(w, r) {
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}
}

func handleClientsGet(state *fakes.State, w http.ResponseWriter, r *http.Request) {
	if !requireSelfServiceAuth(w, r) {
		return
	}

	records := state.GetDb().Clients
	clients := make([]*maskinporten.ClientResponse, 0, len(records))
	for _, record := range records {
		if *record.Client.ClientName == "altinn_apps_supplier_client" {
			continue
		}
		clients = append(clients, record.Client)
	}

	writeJSON(w, http.StatusOK, clients)
}

func handleClientsPost(state *fakes.State, w http.ResponseWriter, r *http.Request) {
	if !requireSelfServiceAuth(w, r) {
		return
	}

	decoder := json.NewDecoder(r.Body)
	var client maskinporten.AddClientRequest
	if err := decoder.Decode(&client); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("couldn't read request: %v", err)
		return
	}
	if slices.Contains(client.Scopes, "idporten:dcr.altinn") {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("clients cannot request idporten:dcr.altinn scope")
		return
	}
	if client.SupplierOrgno != nil && *client.SupplierOrgno != "" {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("clients cannot set supplier orgno in self-service")
		return
	}
	if client.ClientOrgno == nil || *client.ClientOrgno == "" {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("clients must set client orgno in self-service")
		return
	}

	clientRecord, err := state.GetDb().Insert(&client, nil, "")
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("couldn't insert client: %v", err)
		return
	}

	writeJSON(w, http.StatusCreated, clientRecord.Client)
}

func handleClientByID(w http.ResponseWriter, r *http.Request) {
	state := stateFromContext(r.Context())

	clientId := r.PathValue("clientId")

	switch r.Method {
	case http.MethodGet:
		w.WriteHeader(
			http.StatusInternalServerError,
		) // As of manual testing, it just returns 500 here (even though the endopint doesnt exist)
		return
	case http.MethodPut:
		handleClientPut(state, clientId, w, r)
	case http.MethodDelete:
		if !requireSelfServiceAuth(w, r) {
			return
		}

		deleted := state.GetDb().Delete(clientId)
		if !deleted {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		if !requireSelfServiceAuth(w, r) {
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}
}

func handleClientPut(state *fakes.State, clientId string, w http.ResponseWriter, r *http.Request) {
	if !requireSelfServiceAuth(w, r) {
		return
	}

	decoder := json.NewDecoder(r.Body)
	var client maskinporten.UpdateClientRequest
	if err := decoder.Decode(&client); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("couldn't read request: %v", err)
		return
	}

	if slices.Contains(client.Scopes, "idporten:dcr.altinn") {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("clients cannot request idporten:dcr.altinn scope")
		return
	}

	if !state.GetDb().Delete(clientId) {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("couldn't read request: client does not exist")
		return
	}

	addReq := &maskinporten.AddClientRequest{
		ClientId:                          client.ClientId,
		ClientName:                        client.ClientName,
		ClientOrgno:                       client.ClientOrgno,
		SupplierOrgno:                     client.SupplierOrgno,
		Description:                       client.Description,
		Active:                            client.Active,
		ApplicationType:                   client.ApplicationType,
		IntegrationType:                   client.IntegrationType,
		Scopes:                            client.Scopes,
		GrantTypes:                        client.GrantTypes,
		TokenEndpointAuthMethod:           client.TokenEndpointAuthMethod,
		RefreshTokenLifetime:              client.RefreshTokenLifetime,
		RefreshTokenUsage:                 client.RefreshTokenUsage,
		AccessTokenLifetime:               client.AccessTokenLifetime,
		AuthorizationLifetime:             client.AuthorizationLifetime,
		LogoUri:                           client.LogoUri,
		RedirectUris:                      client.RedirectUris,
		PostLogoutRedirectUris:            client.PostLogoutRedirectUris,
		FrontchannelLogoutSessionRequired: client.FrontchannelLogoutSessionRequired,
		FrontchannelLogoutUri:             client.FrontchannelLogoutUri,
		SsoDisabled:                       client.SsoDisabled,
		CodeChallengeMethod:               client.CodeChallengeMethod,
	}
	updatedRecord, err := state.GetDb().Insert(addReq, nil, clientId)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		log.Printf("couldn't insert client: %v", err)
		return
	}

	writeJSON(w, http.StatusOK, updatedRecord.Client)
}

func handleClientJwks(w http.ResponseWriter, r *http.Request) {
	state := stateFromContext(r.Context())

	clientId := r.PathValue("clientId")

	switch r.Method {
	case http.MethodGet:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.Header().Add("Content-Type", "application/json")

		clientRecord := state.GetDb().Get(clientId)
		if clientRecord == nil {
			w.WriteHeader(http.StatusNotFound)
			return
		}

		writeJSON(w, http.StatusOK, clientRecord.Jwks)

	case http.MethodPost:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		decoder := json.NewDecoder(r.Body)
		var jwks crypto.Jwks
		err := decoder.Decode(&jwks)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			log.Printf("couldn't read request: %v\n", err)
			return
		}

		err = state.GetDb().UpdateJwks(clientId, &jwks)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			log.Printf("couldn't update JWKS: %v\n", err)
			return
		}
		w.WriteHeader(http.StatusCreated)

	default:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		w.WriteHeader(http.StatusNotFound)
	}
}

func runSelfServiceApi(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	name := "Self Service API"
	addr := ":8051"

	serve(ctx, name, addr, func(mux *http.ServeMux) {
		mux.HandleFunc("/test/dump", handleTestDump)
		mux.HandleFunc("/test/reset", handleTestReset)
		mux.HandleFunc("/api/v1/altinn/admin/clients", handleClients)
		mux.HandleFunc("/api/v1/altinn/admin/clients/{clientId}", handleClientByID)
		mux.HandleFunc("/api/v1/altinn/admin/clients/{clientId}/jwks", handleClientJwks)
	})
}

func runOrgRegistryApi(ctx context.Context, wg *sync.WaitGroup) {
	defer wg.Done()
	name := "Org Registry API"
	addr := ":8052"

	serve(ctx, name, addr, func(mux *http.ServeMux) {
		mux.HandleFunc("/orgs/altinn-orgs.json", handleOrgRegistry)
	})
}

func handleOrgRegistry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	fakeOrgs := map[string]map[string]orgs.Org{
		"orgs": {
			"ttd": {
				Name:  orgs.OrgName{En: "Test Department", Nb: "Testdepartementet", Nn: "Testdepartementet"},
				OrgNr: "405003309", // NOTE: this matches the org nr in the registry testdata in localtest, keep in sync
			},
			"digdir": {
				Name: orgs.OrgName{
					En: "Norwegian Digitalisation Agency",
					Nb: "Digitaliseringsdirektoratet",
					Nn: "Digitaliseringsdirektoratet",
				},
				OrgNr: "991825827",
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	writeJSON(w, http.StatusOK, fakeOrgs)
}

func healthEndpoint(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
}

var shutdownSignals = []os.Signal{os.Interrupt, syscall.SIGTERM}

func setupSignalHandler() context.Context {
	ctx, stop := signal.NotifyContext(context.Background(), shutdownSignals...)
	go func() {
		<-ctx.Done()
		stop()
	}()

	return ctx
}
