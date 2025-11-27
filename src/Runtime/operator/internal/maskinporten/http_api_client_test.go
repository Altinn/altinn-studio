package maskinporten

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"altinn.studio/operator/internal/caching"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/google/uuid"
	"github.com/jonboulle/clockwork"
	"github.com/onsi/gomega"
	. "github.com/onsi/gomega"
)

type testApi struct {
	path         string
	statusCode   int
	responseBody string
}

func getMaskinportenApiFixture(
	g *gomega.WithT,
	generateApis func(cfg *config.Config) (apis []testApi),
) (*httptest.Server, *config.ConfigMonitor, *operatorcontext.Context) {
	ctx := context.Background()
	environment := operatorcontext.EnvironmentLocal
	configMonitor := config.GetConfigOrDie(ctx, environment, "")
	configValue := configMonitor.Get()
	operatorContext := operatorcontext.DiscoverOrDie(ctx, environment, nil)

	// Create modified config that will be updated with the server URL
	modifiedConfigValue := *configValue

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Use the modified config which has the test server URL
		apis := generateApis(&modifiedConfigValue)
		for _, api := range apis {
			if api.path != r.URL.Path {
				continue
			}

			w.WriteHeader(api.statusCode)
			if api.responseBody != "" {
				w.Header().Add("Content-Type", "application/json")
				_, err := w.Write([]byte(api.responseBody))
				g.Expect(err).NotTo(HaveOccurred())
			}
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))

	// Update the modified config with the test server URL
	modifiedConfigValue.MaskinportenApi.AuthorityUrl = server.URL
	testConfigMonitor := config.NewConfigMonitorForTesting(&modifiedConfigValue)

	return server, testConfigMonitor, operatorContext
}

func okWellKnownHandler(g *gomega.WithT, cfg *config.Config) testApi {
	tokenEndpoint, err := url.JoinPath(cfg.MaskinportenApi.AuthorityUrl, "/token")
	g.Expect(err).NotTo(HaveOccurred())
	jwksEndpoint, err := url.JoinPath(cfg.MaskinportenApi.AuthorityUrl, "/jwk")
	g.Expect(err).NotTo(HaveOccurred())
	body := fmt.Sprintf(
		`{"issuer":"%s","token_endpoint":"%s","jwks_uri":"%s","token_endpoint_auth_methods_supported":["private_key_jwt"],"grant_types_supported":["urn:ietf:params:oauth:grant-type:jwt-bearer"],"token_endpoint_auth_signing_alg_values_supported":["RS256","RS384","RS512"],"authorization_details_types_supported":["urn:altinn:systemuser"]}`,
		cfg.MaskinportenApi.AuthorityUrl,
		tokenEndpoint,
		jwksEndpoint,
	)

	return testApi{"/.well-known/oauth-authorization-server", http.StatusOK, body}
}

func getMaskinportenApiWellKnownFixture(
	g *gomega.WithT,
	statusCode int,
) (*httptest.Server, *config.ConfigMonitor, *operatorcontext.Context) {
	return getMaskinportenApiFixture(
		g,
		func(cfg *config.Config) (apis []testApi) {
			if statusCode == http.StatusOK {
				return []testApi{okWellKnownHandler(g, cfg)}
			} else {
				return []testApi{{"/.well-known/oauth-authorization-server", statusCode, ""}}
			}
		},
	)
}

func TestFixtureIsNotRemote(t *testing.T) {
	g := NewWithT(t)

	ctx := context.Background()
	environment := operatorcontext.EnvironmentLocal
	configBefore := config.GetConfigOrDie(ctx, environment, "")

	server, configAfter, _ := getMaskinportenApiWellKnownFixture(g, http.StatusOK)
	defer server.Close()

	g.Expect(configAfter.Get().MaskinportenApi.AuthorityUrl).NotTo(Equal(configBefore.Get().MaskinportenApi.AuthorityUrl))
	g.Expect(configAfter.Get().MaskinportenApi.AuthorityUrl).To(ContainSubstring("http://127.0.0.1"))
}

func TestWellKnownConfigOk(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	clock := clockwork.NewFakeClock()

	server, config, opCtx := getMaskinportenApiWellKnownFixture(g, http.StatusOK)
	defer server.Close()

	apiClient, err := NewHttpApiClient(config, opCtx, clock)
	g.Expect(err).NotTo(HaveOccurred())

	cfg, err := apiClient.GetWellKnownConfiguration(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(cfg).NotTo(BeNil())
	tokenEndpoint, err := url.JoinPath(config.Get().MaskinportenApi.AuthorityUrl, "/token")
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(cfg.TokenEndpoint).To(Equal(tokenEndpoint))
}

func TestWellKnownConfigNotFound(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	clock := clockwork.NewFakeClock()

	server, config, opCtx := getMaskinportenApiWellKnownFixture(g, http.StatusNotFound)
	defer server.Close()

	apiClient, err := NewHttpApiClient(config, opCtx, clock)
	g.Expect(err).NotTo(HaveOccurred())

	cfg, err := apiClient.GetWellKnownConfiguration(ctx)
	g.Expect(err).To(HaveOccurred())
	g.Expect(cfg).To(BeNil())
}

func TestWellKnownConfigCaches(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	clock := clockwork.NewFakeClock()

	server, config, opCtx := getMaskinportenApiWellKnownFixture(g, http.StatusOK)
	defer server.Close()

	apiClient, err := NewHttpApiClient(config, opCtx, clock)
	g.Expect(err).NotTo(HaveOccurred())

	config1, err := apiClient.GetWellKnownConfiguration(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(config1).NotTo(BeNil())

	config2, err := apiClient.GetWellKnownConfiguration(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(config2).NotTo(BeNil())
	config3 := *config1
	g.Expect(config1).To(BeIdenticalTo(config2))     // Due to cache
	g.Expect(config1).ToNot(BeIdenticalTo(&config3)) // Copied above

	clock.Advance((5 + 1) * time.Minute) // Advance the clock past cache expiration

	config4, err := apiClient.GetWellKnownConfiguration(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(config4).NotTo(BeNil())
	g.Expect(config1).ToNot(BeIdenticalTo(config4)) // Due to cache expiration
}

func TestCreateGrant(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	clock := clockwork.NewFakeClock()

	server, config, opCtx := getMaskinportenApiWellKnownFixture(g, http.StatusOK)
	defer server.Close()

	client, err := NewHttpApiClient(config, opCtx, clock)
	g.Expect(err).NotTo(HaveOccurred())

	grant, err := client.createGrant(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(grant).NotTo(BeNil())
}

func getMaskinportenApiAccessTokenFixture(
	g *gomega.WithT,
	statusCode int,
) (*httptest.Server, *config.ConfigMonitor, *operatorcontext.Context, string) {
	accessToken := uuid.NewString()

	server, config, opCtx := getMaskinportenApiFixture(
		g,
		func(cfg *config.Config) (apis []testApi) {
			var body string
			if statusCode == http.StatusOK {
				body = fmt.Sprintf(
					`{"access_token":"%s","token_type":"Bearer","expires_in":3600}`,
					accessToken,
				)
			}
			return []testApi{
				okWellKnownHandler(g, cfg),
				{"/token", statusCode, body},
			}
		},
	)

	return server, config, opCtx, accessToken
}

func TestFetchAccessToken(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	clock := clockwork.NewFakeClock()

	server, config, opCtx, accessToken := getMaskinportenApiAccessTokenFixture(g, http.StatusOK)
	defer server.Close()

	client, err := NewHttpApiClient(config, opCtx, clock)
	g.Expect(err).NotTo(HaveOccurred())

	token, err := client.accessTokenFetcher(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(token.AccessToken).To(Equal(accessToken))
}

func TestFetchAccessTokenReal(t *testing.T) {
	t.Skip("Only used for adhoc integration testing")

	g := NewWithT(t)
	ctx := context.Background()
	clock := clockwork.NewFakeClock()

	environment := operatorcontext.EnvironmentLocal
	config := config.GetConfigOrDie(ctx, environment, "")
	operatorContext := operatorcontext.DiscoverOrDie(ctx, environment, nil)
	client, err := NewHttpApiClient(config, operatorContext, clock)
	g.Expect(err).NotTo(HaveOccurred())

	tokenResponse, err := client.accessTokenFetcher(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(tokenResponse).NotTo(BeNil())
}

// func TestFetchClientsReal(t *testing.T) {
// 	t.Skip("Only used for adhoc integration testing")

// 	g := NewWithT(t)
// 	ctx := context.Background()
// 	clock := clockwork.NewFakeClock()

// 	operatorContext := operatorcontext.DiscoverOrDie(ctx)
// 	operatorContext.OverrideEnvironment(operatorcontext.EnvironmentDev)
// 	cfg := config.GetConfigOrDie(
// 		operatorContext,
// 		config.ConfigSourceDefault,
// 		"",
// 	)
// 	client, err := newApiClient(&cfg.MaskinportenApi, operatorContext, clock)
// 	g.Expect(err).NotTo(HaveOccurred())

// 	clients, err := client.getAllClients(ctx)
// 	g.Expect(err).NotTo(HaveOccurred())
// 	g.Expect(clients).NotTo(BeNil())
// }

// func TestCreateClientReal(t *testing.T) {
// 	t.Skip("Only used for adhoc integration testing")

// 	g := NewWithT(t)
// 	ctx := context.Background()
// 	clock := clockwork.NewFakeClock()

// 	operatorContext := operatorcontext.DiscoverOrDie(ctx)
// 	operatorContext.OverrideEnvironment(operatorcontext.EnvironmentDev)
// 	cfg := config.GetConfigOrDie(
// 		operatorContext,
// 		config.ConfigSourceDefault,
// 		"",
// 	)
// 	client, err := newApiClient(&cfg.MaskinportenApi, operatorContext, clock)
// 	g.Expect(err).NotTo(HaveOccurred())

// 	mpClient := &ClientInfo{
// 		Id:     "",
// 		AppId:  "app1",
// 		Scopes: []string{"altinn:serviceowner/instances.read"},
// 	}
// 	err = client.createClient(ctx, mpClient)
// 	g.Expect(err).NotTo(HaveOccurred())
// 	g.Expect(mpClient.Id).NotTo(BeEmpty())
// }

// func TestDeleteClientReal(t *testing.T) {
// 	t.Skip("Only used for adhoc integration testing")

// 	g := NewWithT(t)
// 	ctx := context.Background()
// 	clock := clockwork.NewFakeClock()

// 	operatorContext := operatorcontext.DiscoverOrDie(ctx)
// 	operatorContext.OverrideEnvironment(operatorcontext.EnvironmentDev)
// 	cfg := config.GetConfigOrDie(
// 		operatorContext,
// 		config.ConfigSourceDefault,
// 		"",
// 	)
// 	client, err := NewHttpApiClient(&cfg.MaskinportenApi, operatorContext, clock)
// 	g.Expect(err).NotTo(HaveOccurred())

// 	clients, err := client.GetAllClients(ctx)
// 	g.Expect(err).NotTo(HaveOccurred())
// 	g.Expect(clients).NotTo(BeNil())

// 	for i := range clients {
// 		err = client.DeleteClient(ctx, clients[i].ClientId)
// 		g.Expect(err).NotTo(HaveOccurred())
// 	}
// }

func TestCreateReq(t *testing.T) {
	g := NewWithT(t)
	ctx := context.Background()
	clock := clockwork.NewFakeClock()

	accessToken := uuid.NewString()
	client := &HttpApiClient{
		// Setup mock for accessToken with a custom retriever function.
		// This Cached[tokenResponse] instance will return the mock token when Get is called.
		accessToken: caching.NewCachedAtom(time.Minute*5, clock, func(ctx context.Context) (*TokenResponse, error) {
			// Return a mock tokenResponse
			return &TokenResponse{AccessToken: accessToken}, nil
		}),
	}

	var url = "http://example.com/api/endpoint"

	req, err := client.createReq(ctx, url, "POST", nil)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(req).NotTo(BeNil())
	g.Expect(req.Method).To(Equal("POST"))
	g.Expect(req.URL.String()).To(Equal(url))
	expectedHeader := fmt.Sprintf("Bearer %s", accessToken)
	g.Expect(req.Header.Get("Authorization")).To(Equal(expectedHeader))
}
