// Program that contains fake APIs for Maskinporten self-service API and OAuth authority server
package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"slices"
	"strings"
	"sync"
	"syscall"

	"github.com/go-errors/errors"

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

const POST = "POST"
const GET = "GET"
const PUT = "PUT"
const DELETE = "DELETE"

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
	Scopes   []string `json:"scopes"`
	ClientId string   `json:"client_id"`
}

func serve(ctx context.Context, name string, addr string, registerHandlers func(*http.ServeMux)) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthEndpoint)
	registerHandlers(mux)
	server := &http.Server{
		Addr:    addr,
		Handler: mux,
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

	state := ctx.Value(StateKey).(*fakes.State)
	assert.Assert(state != nil)

	serve(ctx, name, addr, func(mux *http.ServeMux) {
		mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
			if r.Method != POST {
				w.WriteHeader(404)
				return
			}
			grantType := r.URL.Query().Get("grant_type")
			if grantType != "urn:ietf:params:oauth:grant-type:jwt-bearer" {
				w.WriteHeader(400)
				log.Printf("invalid grant_type: %s\n", grantType)
				return
			}
			assertion := r.URL.Query().Get("assertion")
			if assertion == "" {
				w.WriteHeader(400)
				log.Printf("missing assertion\n")
				return
			}

			jwt, err := crypto.ParseJWT(assertion)
			if err != nil {
				w.WriteHeader(400)
				log.Printf("couldn't parse JWT: %v\n", errors.Wrap(err, 0))
				return
			}

			keyID := jwt.KeyID()
			if keyID == "" {
				w.WriteHeader(400)
				log.Printf("missing kid\n")
				return
			}

			clients := state.GetDb().Query(func(ocr *fakes.ClientRecord) bool {
				if ocr.Jwks == nil {
					return false
				}
				for _, jwk := range ocr.Jwks.Keys {
					if jwk.KeyID() == keyID {
						return true
					}
				}
				return false
			})
			if len(clients) != 1 {
				w.WriteHeader(400)
				log.Printf("client not found: %s\n", keyID)
				return
			}
			client := clients[0]

			claims, err := jwt.DecodeClaims(client.Jwks.Keys[0])
			if err != nil {
				w.WriteHeader(400)
				log.Printf("couldn't validate JWT: %v\n", errors.Wrap(err, 0))
				return
			}

			clientId := claims.Issuer
			if clientId == "" {
				w.WriteHeader(400)
				log.Printf("missing issuer\n")
				return
			}
			if clientId != client.ClientId {
				w.WriteHeader(400)
				log.Printf("invalid issuer: %s\n", clientId)
				return
			}
			if claims.Scope == "" {
				w.WriteHeader(400)
				log.Printf("missing scope\n")
				return
			}
			requestedScopes := strings.Fields(claims.Scope)
			for _, scope := range requestedScopes {
				hasAccessToScope := slices.Contains(client.Client.Scopes, scope)
				if !hasAccessToScope {
					w.WriteHeader(400)
					log.Printf("client doesn't have access to scope: %s\n", scope)
					return
				}
			}

			w.Header().Add("Content-Type", "application/json")

			fakeToken := FakeToken{
				Scopes:   requestedScopes,
				ClientId: client.ClientId,
			}
			tokenJson, err := json.Marshal(fakeToken)
			if err != nil {
				w.WriteHeader(500)
				log.Printf("couldn't encode scopes: %v\n", errors.Wrap(err, 0))
				return
			}
			base64Token := base64.StdEncoding.EncodeToString(tokenJson)

			encoder := json.NewEncoder(w)
			err = encoder.Encode(maskinporten.TokenResponse{
				AccessToken: base64Token,
				TokenType:   "Bearer",
				Scope:       strings.Join(requestedScopes, " "),
				ExpiresIn:   120,
			})
			if err != nil {
				w.WriteHeader(500)
				log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
			}
		})
		mux.HandleFunc("/.well-known/oauth-authorization-server", func(w http.ResponseWriter, r *http.Request) {
			if r.Method != GET {
				w.WriteHeader(404)
				return
			}
			w.Header().Add("Content-Type", "application/json")
			encoder := json.NewEncoder(w)
			err := encoder.Encode(maskinporten.WellKnownResponse{
				Issuer:                            "http://localhost:8050",
				TokenEndpoint:                     "http://localhost:8050/token",
				JwksURI:                           "http://localhost:8050/jwks",
				TokenEndpointAuthMethodsSupported: []string{"private_key_jwt"},
				GrantTypesSupported:               []string{"urn:ietf:params:oauth:grant-type:jwt-bearer"},
				TokenEndpointAuthSigningAlgValuesSupported: crypto.SignatureAlgorithmsStr,
			})
			if err != nil {
				w.WriteHeader(500)
				log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
			}
		})
	})
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

func handleTestDump(w http.ResponseWriter, r *http.Request) {
	state := r.Context().Value(StateKey).(*fakes.State)
	assert.Assert(state != nil)

	w.Header().Add("Content-Type", "application/json")
	encoder := json.NewEncoder(w)
	err := encoder.Encode(state.GetAll())
	if err != nil {
		w.WriteHeader(500)
		log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
	}
}

func handleTestReset(w http.ResponseWriter, r *http.Request) {
	if r.Method != POST {
		w.WriteHeader(405)
		return
	}

	state := r.Context().Value(StateKey).(*fakes.State)
	assert.Assert(state != nil)

	// Clear all state to ensure deterministic test runs
	state.Reset()

	w.WriteHeader(200)
}

func handleClients(w http.ResponseWriter, r *http.Request) {
	state := r.Context().Value(StateKey).(*fakes.State)
	assert.Assert(state != nil)

	switch r.Method {
	case GET:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		w.Header().Add("Content-Type", "application/json")
		encoder := json.NewEncoder(w)
		records := state.GetDb().Clients
		clients := make([]*maskinporten.ClientResponse, len(records))
		for i, record := range records {
			clients[i] = record.Client
		}

		err := encoder.Encode(clients)
		if err != nil {
			w.WriteHeader(500)
			log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
		}
	case POST:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		decoder := json.NewDecoder(r.Body)
		var client maskinporten.AddClientRequest
		err := decoder.Decode(&client)
		if err != nil {
			w.WriteHeader(400)
			log.Printf("couldn't read request: %v\n", errors.Wrap(err, 0))
			return
		}

		if slices.Contains(client.Scopes, "idporten:dcr.altinn") {
			w.WriteHeader(400)
			log.Printf("clients cannot request idporten:dcr.altinn scope\n")
			return
		}

		clientRecord, err := state.GetDb().Insert(&client, nil, "")
		if err != nil {
			w.WriteHeader(400)
			log.Printf("couldn't insert client: %v\n", errors.Wrap(err, 0))
			return
		}

		w.WriteHeader(200)
		w.Header().Add("Content-Type", "application/json")
		encoder := json.NewEncoder(w)
		err = encoder.Encode(clientRecord.Client)
		if err != nil {
			w.WriteHeader(500)
			log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
			return
		}

	default:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		w.WriteHeader(404)
	}
}

func handleClientByID(w http.ResponseWriter, r *http.Request) {
	state := r.Context().Value(StateKey).(*fakes.State)
	assert.Assert(state != nil)

	clientId := r.PathValue("clientId")

	switch r.Method {
	case GET:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		clientRecord := state.GetDb().Get(clientId)
		if clientRecord == nil {
			w.WriteHeader(404)
			return
		}
		w.Header().Add("Content-Type", "application/json")
		encoder := json.NewEncoder(w)
		err := encoder.Encode(clientRecord.Client)
		if err != nil {
			w.WriteHeader(500)
			log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
		}
	case PUT:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		decoder := json.NewDecoder(r.Body)
		var client maskinporten.UpdateClientRequest
		err := decoder.Decode(&client)
		if err != nil {
			w.WriteHeader(400)
			log.Printf("couldn't read request: %v\n", errors.Wrap(err, 0))
			return
		}

		if slices.Contains(client.Scopes, "idporten:dcr.altinn") {
			w.WriteHeader(400)
			log.Printf("clients cannot request idporten:dcr.altinn scope\n")
			return
		}

		deleted := state.GetDb().Delete(clientId)
		if !deleted {
			w.WriteHeader(400)
			log.Printf(
				"couldn't read request: client does not exist clientId=%s\n",
				clientId,
			)
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
			w.WriteHeader(400)
			log.Printf("couldn't insert client: %v\n", errors.Wrap(err, 0))
			return
		}

		w.WriteHeader(200)
		w.Header().Add("Content-Type", "application/json")
		encoder := json.NewEncoder(w)
		err = encoder.Encode(updatedRecord.Client)
		if err != nil {
			w.WriteHeader(500)
			log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
			return
		}
	case DELETE:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		deleted := state.GetDb().Delete(clientId)
		if !deleted {
			w.WriteHeader(404)
			return
		}
		w.WriteHeader(200)

	default:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		w.WriteHeader(404)
	}
}

func handleClientJwks(w http.ResponseWriter, r *http.Request) {
	state := r.Context().Value(StateKey).(*fakes.State)
	assert.Assert(state != nil)

	clientId := r.PathValue("clientId")

	switch r.Method {
	case GET:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}
		w.Header().Add("Content-Type", "application/json")

		clientRecord := state.GetDb().Get(clientId)
		if clientRecord == nil {
			w.WriteHeader(404)
			return
		}

		encoder := json.NewEncoder(w)
		err := encoder.Encode(clientRecord.Jwks)
		if err != nil {
			w.WriteHeader(500)
			log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
		}

	case POST:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}

		decoder := json.NewDecoder(r.Body)
		var jwks crypto.Jwks
		err := decoder.Decode(&jwks)
		if err != nil {
			w.WriteHeader(400)
			log.Printf("couldn't read request: %v\n", errors.Wrap(err, 0))
			return
		}

		err = state.GetDb().UpdateJwks(clientId, &jwks)
		if err != nil {
			w.WriteHeader(400)
			log.Printf("couldn't update JWKS: %v\n", errors.Wrap(err, 0))
			return
		}
		w.WriteHeader(201)

	default:
		if selfServiceAuth(r) == nil {
			w.WriteHeader(401)
			return
		}
		w.WriteHeader(404)
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
	if r.Method != GET {
		w.WriteHeader(404)
		return
	}

	fakeOrgs := map[string]orgs.Org{
		"ttd": {
			Name:  orgs.OrgName{En: "Test Department", Nb: "Testdepartementet", Nn: "Testdepartementet"},
			OrgNr: "405003309",
		},
		"digdir": {
			Name:  orgs.OrgName{En: "Norwegian Digitalisation Agency", Nb: "Digitaliseringsdirektoratet", Nn: "Digitaliseringsdirektoratet"},
			OrgNr: "991825827",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(fakeOrgs); err != nil {
		w.WriteHeader(500)
		log.Printf("couldn't write response: %v\n", errors.Wrap(err, 0))
	}
}

func healthEndpoint(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(200)
}

var shutdownSignals = []os.Signal{os.Interrupt, syscall.SIGTERM}

func setupSignalHandler() context.Context {
	ctx, cancel := context.WithCancel(context.Background())

	c := make(chan os.Signal, 2)
	signal.Notify(c, shutdownSignals...)
	go func() {
		<-c
		cancel()
		<-c
		os.Exit(1) // second signal. Exit directly.
	}()

	return ctx
}
