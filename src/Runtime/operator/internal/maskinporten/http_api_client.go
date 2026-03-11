package maskinporten

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/go-logr/logr"
	"github.com/jonboulle/clockwork"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/trace"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/caching"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/telemetry"
)

type WellKnownResponse struct {
	Issuer                                     string   `json:"issuer"`
	TokenEndpoint                              string   `json:"token_endpoint"`
	JwksURI                                    string   `json:"jwks_uri"`
	TokenEndpointAuthMethodsSupported          []string `json:"token_endpoint_auth_methods_supported"`
	GrantTypesSupported                        []string `json:"grant_types_supported"`
	TokenEndpointAuthSigningAlgValuesSupported []string `json:"token_endpoint_auth_signing_alg_values_supported"`
}

var (
	ErrFailedToCreateJwks        = errors.New("created Maskinporten client, but failed to create associated JWKS")
	ErrClientNotFound            = errors.New("maskinporten client not found")
	errNoClientsFound            = errors.New("no clients found")
	errClientWithEmptyID         = errors.New("found client with empty ID")
	errClientInfoMissingID       = errors.New("missing ID on client info")
	errClientWithoutName         = errors.New("client has no name")
	errMissingClientID           = errors.New("missing ID on client info")
	errClientNameRequired        = errors.New("client name must be provided")
	errClientNamePrefixMismatch  = errors.New("client name must start with expected prefix")
	errClientJwksRequired        = errors.New("can't create maskinporten client without JWKS initialized")
	errPrivateJwksUploadRejected = errors.New("tried to upload private key JWKS to Maskinporten")
	errUpdateClientMissingID     = errors.New("tried to update maskinporten client with empty ID")
	errUnexpectedAPIStatus       = errors.New("unexpected HTTP response from Maskinporten API")
	errRequestURLRequired        = errors.New("request URL is required")
	errRequestURLHostMismatch    = errors.New("request URL does not match configured Maskinporten hosts")
)

// HttpApiClient calls necessary APIs in the Maskinporten authority service
// and the self-service APIs to manage clients. It also makes sure to enforce
// rules related to naming/scoping according to the passed in config.
//
// Docs:
//   - https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument
//   - https://docs.digdir.no/docs/Maskinporten/maskinporten_protocol_token
//   - https://docs.digdir.no/docs/Maskinporten/maskinporten_func_wellknown
//   - Dev self service API: https://api.samarbeid.digdir.dev/swagger-ui/index.html
//   - Dev auth/token API: https://maskinporten.dev
type HttpApiClient struct {
	tracer                       trace.Tracer
	clock                        clockwork.Clock
	configMonitor                *config.ConfigMonitor
	context                      *operatorcontext.Context
	client                       http.Client
	logger                       logr.Logger
	clientNameFullPrefix         string
	clientNameServiceOwnerPrefix string
	wellKnown                    caching.CachedAtom[WellKnownResponse]
	accessToken                  caching.CachedAtom[TokenResponse]
	hydrated                     bool
}

func NewHttpApiClient(
	configMonitor *config.ConfigMonitor,
	opCtx *operatorcontext.Context,
	clock clockwork.Clock,
) (*HttpApiClient, error) {
	// Validate initial config
	cfg := configMonitor.Get()
	jwk := crypto.Jwk{}
	if err := json.Unmarshal([]byte(cfg.MaskinportenApi.Jwk), &jwk); err != nil {
		return nil, fmt.Errorf("parse configured Maskinporten JWK: %w", err)
	}

	apiClient := &HttpApiClient{
		configMonitor: configMonitor,
		context:       opCtx,
		client:        http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)},
		hydrated:      false,
		tracer:        telemetry.Tracer(),
		clock:         clock,
		logger:        log.Log.WithName("maskinporten-client"),

		clientNameFullPrefix:         getClientNameFullPrefix(opCtx),
		clientNameServiceOwnerPrefix: getClientNameServiceOwnerPrefix(opCtx),
	}

	apiClient.wellKnown = caching.NewCachedAtom(5*time.Minute, clock, apiClient.wellKnownFetcher)
	apiClient.accessToken = caching.NewCachedAtom(1*time.Minute, clock, apiClient.accessTokenFetcher)

	return apiClient, nil
}

func (c *HttpApiClient) getConfig() *config.MaskinportenApiConfig {
	return &c.configMonitor.Get().MaskinportenApi
}

func (c *HttpApiClient) getJwk() (*crypto.Jwk, error) {
	cfg := c.getConfig()
	jwk := crypto.Jwk{}
	if err := json.Unmarshal([]byte(cfg.Jwk), &jwk); err != nil {
		return nil, fmt.Errorf("parse configured JWK: %w", err)
	}
	return &jwk, nil
}

func (c *HttpApiClient) createReq(
	ctx context.Context,
	endpoint string,
	method string,
	body io.Reader,
) (*http.Request, error) {
	tokenResponse, err := c.accessToken.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create new request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)

	return req, nil
}

func (c *HttpApiClient) GetWellKnownConfiguration(ctx context.Context) (*WellKnownResponse, error) {
	ctx, span := c.tracer.Start(ctx, "GetWellKnownConfiguration")
	defer span.End()

	result, err := c.wellKnown.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get well-known configuration: %w", err)
	}
	return result, nil
}

func (c *HttpApiClient) GetAccessToken(ctx context.Context) (*TokenResponse, error) {
	ctx, span := c.tracer.Start(ctx, "GetAccessToken")
	defer span.End()

	result, err := c.accessToken.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get access token: %w", err)
	}
	return result, nil
}

func (c *HttpApiClient) GetAllClients(ctx context.Context) ([]ClientResponse, error) {
	ctx, span := c.tracer.Start(ctx, "GetAllClients")
	defer span.End()

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients")
	if err != nil {
		return nil, fmt.Errorf("build clients endpoint URL: %w", err)
	}
	req, err := c.createReq(ctx, endpointUrl, "GET", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/json")
	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	dtos, err := deserialize[[]ClientResponse](resp.Body)
	if err != nil {
		return nil, err
	}

	if dtos == nil {
		return nil, errNoClientsFound
	}

	result := make([]ClientResponse, 0, 16)
	skippedClients := 0
	skippedServiceOwners := make(map[string]struct{})
	skippedEnvironments := make(map[string]struct{})

	for _, cl := range dtos {
		if cl.ClientId == "" {
			return nil, errClientWithEmptyID
		}
		if c.context.ServiceOwner.Id == "digdir" && cl.ClientId == c.getConfig().ClientId {
			// If this operator is running as digdir, the supplier client is also defined there
			// so we need to skip it (we should never change or process the supplier client from here)
			// TODO: unless we want to rotate JWKS automatically from the operator? o_O
			skippedClients++
			continue
		}
		if cl.ClientName == nil {
			return nil, fmt.Errorf("%w: %s", errClientWithoutName, cl.ClientId)
		}
		if !strings.HasPrefix(*cl.ClientName, c.clientNameFullPrefix) {
			skippedClients++
			if so, env, ok := parseClientNamePrefix(*cl.ClientName); ok {
				skippedServiceOwners[so] = struct{}{}
				skippedEnvironments[env] = struct{}{}
			}
			continue
		}

		result = append(result, cl)
	}

	if skippedClients > 0 {
		c.logger.Info("skipped unrelated clients",
			"count", skippedClients,
			"skippedServiceOwners", mapKeys(skippedServiceOwners),
			"skippedEnvironments", mapKeys(skippedEnvironments))
	}

	return result, nil
}

func (c *HttpApiClient) GetClient(
	ctx context.Context,
	clientId string,
) (*ClientResponse, *crypto.Jwks, error) {
	ctx, span := c.tracer.Start(ctx, "GetClient")
	defer span.End()

	assert.That(clientId != "", "GetClient: clientId must be non-empty")

	// The API does not currently have an endpoint for returning by ID
	clients, err := c.GetAllClients(ctx)
	if err != nil {
		return nil, nil, err
	}

	var client *ClientResponse
	for i := range clients {
		if clients[i].ClientId == clientId {
			client = &clients[i]
			break
		}
	}

	if client == nil {
		return nil, nil, fmt.Errorf("%w: %s", ErrClientNotFound, clientId)
	}

	jwks, err := c.getClientJwks(ctx, clientId)
	if err != nil {
		return nil, nil, err
	}

	return client, jwks, nil
}

func (c *HttpApiClient) getClientJwks(ctx context.Context, clientId string) (*crypto.Jwks, error) {
	ctx, span := c.tracer.Start(ctx, "GetClientJwks")
	defer span.End()

	if clientId == "" {
		return nil, errClientInfoMissingID
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId, "jwks")
	if err != nil {
		return nil, fmt.Errorf("build client JWKS endpoint URL: %w", err)
	}

	req, err := c.createReq(ctx, endpointUrl, "GET", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/json")
	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	jwks, err := deserialize[crypto.Jwks](resp.Body)
	if err != nil {
		return nil, err
	}

	return &jwks, nil
}

func (c *HttpApiClient) CreateClient(
	ctx context.Context,
	client *AddClientRequest,
	jwks *crypto.Jwks,
) (*ClientResponse, error) {
	ctx, span := c.tracer.Start(ctx, "CreateClient")
	defer span.End()

	if client.ClientName == nil || *client.ClientName == "" {
		return nil, errClientNameRequired
	}
	if !strings.HasPrefix(*client.ClientName, c.clientNameFullPrefix) {
		return nil, fmt.Errorf("%w: %s", errClientNamePrefixMismatch, c.clientNameFullPrefix)
	}

	if jwks == nil {
		return nil, errClientJwksRequired
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients")
	if err != nil {
		return nil, fmt.Errorf("build create client endpoint URL: %w", err)
	}

	buf, err := json.Marshal(client)
	if err != nil {
		return nil, fmt.Errorf("marshal create client request: %w", err)
	}

	req, err := c.createReq(ctx, endpointUrl, "POST", bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	// NOTE: as of writing, actual response code does not match OpenAPI spec
	if resp.StatusCode != http.StatusCreated {
		return nil, c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	result, err := deserialize[ClientResponse](resp.Body)
	if err != nil {
		return nil, err
	}
	assert.That(result.ClientId != "", "CreateClient: response must have ClientId")

	err = c.CreateClientJwks(ctx, result.ClientId, jwks)
	if err != nil {
		// If we fail here and it is OK to leave the client without JWK
		// the reconcile iteration will fail and we try again later,
		// at which point we will discover that the client already exists
		// and try to upload the JWK again
		return nil, fmt.Errorf("%w: %w", ErrFailedToCreateJwks, err)
	}

	return &result, nil
}

func (c *HttpApiClient) UpdateClient(
	ctx context.Context,
	clientId string,
	client *UpdateClientRequest,
) (*ClientResponse, error) {
	ctx, span := c.tracer.Start(ctx, "UpdateClient")
	defer span.End()

	if clientId == "" {
		clientName := ""
		if client.ClientName != nil {
			clientName = *client.ClientName
		}
		return nil, fmt.Errorf("%w: %s", errUpdateClientMissingID, clientName)
	}

	if client.ClientName == nil || *client.ClientName == "" {
		return nil, errClientNameRequired
	}
	if !strings.HasPrefix(*client.ClientName, c.clientNameFullPrefix) {
		return nil, fmt.Errorf("%w: %s", errClientNamePrefixMismatch, c.clientNameFullPrefix)
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId)
	if err != nil {
		return nil, fmt.Errorf("build update client endpoint URL: %w", err)
	}

	buf, err := json.Marshal(client)
	if err != nil {
		return nil, fmt.Errorf("marshal update client request: %w", err)
	}

	req, err := c.createReq(ctx, endpointUrl, "PUT", bytes.NewReader(buf))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	dto, err := deserialize[ClientResponse](resp.Body)
	if err != nil {
		return nil, err
	}

	return &dto, nil
}

func (c *HttpApiClient) CreateClientJwks(ctx context.Context, clientId string, jwks *crypto.Jwks) error {
	ctx, span := c.tracer.Start(ctx, "CreateClientJwks")
	defer span.End()

	if clientId == "" {
		return errMissingClientID
	}
	if jwks == nil {
		return errClientJwksRequired
	}
	for _, jwk := range jwks.Keys {
		if !jwk.IsPublic() {
			return fmt.Errorf("%w: %s", errPrivateJwksUploadRejected, clientId)
		}
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId, "jwks")
	if err != nil {
		return fmt.Errorf("build create client JWKS endpoint URL: %w", err)
	}

	buf, err := json.Marshal(&jwks)
	if err != nil {
		return fmt.Errorf("marshal JWKS request: %w", err)
	}

	req, err := c.createReq(ctx, endpointUrl, "POST", bytes.NewReader(buf))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return err
	}

	if resp.StatusCode != http.StatusCreated {
		return c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	return nil
}

func (c *HttpApiClient) DeleteClient(ctx context.Context, clientId string) error {
	ctx, span := c.tracer.Start(ctx, "DeleteClient")
	defer span.End()

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId)
	if err != nil {
		return fmt.Errorf("build delete client endpoint URL: %w", err)
	}

	req, err := c.createReq(ctx, endpointUrl, "DELETE", nil)
	if err != nil {
		return err
	}

	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return err
	}

	// NOTE: as of writing, actual response code does not match OpenAPI spec
	if resp.StatusCode != http.StatusNoContent {
		return c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	return nil
}

func (c *HttpApiClient) createGrant(ctx context.Context) (*string, error) {
	wellKnown, err := c.wellKnown.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("get cached well-known configuration: %w", err)
	}
	assert.That(wellKnown.Issuer != "", "WellKnown.Issuer must be non-empty")

	jwk, err := c.getJwk()
	if err != nil {
		return nil, fmt.Errorf("get configured JWK: %w", err)
	}

	cfg := c.getConfig()
	exp := c.clock.Now().Add(60 * time.Second)

	signedToken, err := jwk.NewJWT(
		[]string{wellKnown.Issuer},
		cfg.ClientId,
		cfg.Scope,
		exp,
		c.clock,
	)
	if err != nil {
		return nil, fmt.Errorf("sign JWT grant: %w", err)
	}

	return &signedToken, nil
}

func (c *HttpApiClient) accessTokenFetcher(ctx context.Context) (*TokenResponse, error) {
	grant, err := c.createGrant(ctx)
	if err != nil {
		return nil, fmt.Errorf("create grant: %w", err)
	}

	endpointUrl, err := url.JoinPath(c.getConfig().AuthorityUrl, "/token")
	if err != nil {
		return nil, fmt.Errorf("build token endpoint URL: %w", err)
	}

	queryParams := url.Values{
		"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"},
		"assertion":  {*grant},
	}

	endpointUrl += "?" + queryParams.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpointUrl, nil)
	if err != nil {
		return nil, fmt.Errorf("create token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	tokenResp, err := deserialize[TokenResponse](resp.Body)
	if err != nil {
		return nil, err
	}
	assert.That(tokenResp.AccessToken != "", "TokenResponse.AccessToken must be non-empty")

	return &tokenResp, nil
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	ExpiresIn   int    `json:"expires_in"`
}

func (c *HttpApiClient) wellKnownFetcher(ctx context.Context) (*WellKnownResponse, error) {
	endpointUrl, err := url.JoinPath(c.getConfig().AuthorityUrl, "/.well-known/oauth-authorization-server")
	if err != nil {
		return nil, fmt.Errorf("build well-known endpoint URL: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpointUrl, nil)
	if err != nil {
		return nil, fmt.Errorf("create well-known request: %w", err)
	}

	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, c.handleErrorResponse(req, resp)
	}
	defer closeResponseBody(resp)

	wellKnownResp, err := deserialize[WellKnownResponse](resp.Body)
	if err != nil {
		return nil, err
	}
	return &wellKnownResp, nil
}

func deserialize[T any](reader io.Reader) (T, error) {
	var result T
	err := json.NewDecoder(reader).Decode(&result)
	if err != nil {
		return result, fmt.Errorf("decode JSON response: %w", err)
	}
	return result, nil
}

// handleErrorResponse attempts to parse a structured API error response, falling back to raw body if parsing fails.
func (c *HttpApiClient) handleErrorResponse(req *http.Request, resp *http.Response) error {
	defer closeResponseBody(resp)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf(
			"%s %s: HTTP %d: failed to read response body: %w",
			req.Method,
			req.URL.Path,
			resp.StatusCode,
			err,
		)
	}

	return fmt.Errorf(
		"%w: %s %s: HTTP %d: %s",
		errUnexpectedAPIStatus,
		req.Method,
		req.URL.Path,
		resp.StatusCode,
		string(body),
	)
}

//nolint:errcheck,gosec // Response body cleanup is best-effort.
func closeResponseBody(resp *http.Response) {
	resp.Body.Close()
}

func (c *HttpApiClient) validateRequestURL(endpoint *url.URL) error {
	if endpoint == nil {
		return errRequestURLRequired
	}
	if c.configMonitor == nil {
		return nil
	}

	for _, baseURL := range []string{c.getConfig().AuthorityUrl, c.getConfig().SelfServiceUrl} {
		allowedURL, err := url.Parse(baseURL)
		if err != nil {
			return fmt.Errorf("parse configured base URL %q: %w", baseURL, err)
		}
		if endpoint.Scheme == allowedURL.Scheme && endpoint.Host == allowedURL.Host {
			return nil
		}
	}

	return fmt.Errorf("%w: %q", errRequestURLHostMismatch, endpoint.String())
}

// retryableHTTPDo performs an HTTP request with retry logic.
func (c *HttpApiClient) retryableHTTPDo(req *http.Request) (*http.Response, error) {
	var resp *http.Response
	var err error

	operation := func() error {
		// Reset body for retries - after the first attempt, req.Body is consumed
		if req.GetBody != nil {
			req.Body, err = req.GetBody()
			if err != nil {
				return backoff.Permanent(err)
			}
		}

		if err = c.validateRequestURL(req.URL); err != nil {
			return backoff.Permanent(err)
		}

		// The request URL is validated against configured Maskinporten hosts immediately above.
		//nolint:bodyclose,gosec // The caller closes successful responses; SSRF is mitigated by validateRequestURL's allowlist check.
		resp, err = c.client.Do(req)
		if err != nil {
			return fmt.Errorf("execute Maskinporten request: %w", err)
		}
		if resp.StatusCode >= http.StatusInternalServerError { // Retrying on 5xx server errors.
			return c.handleErrorResponse(req, resp)
		}
		return nil // No retry needed - success or client side error
	}

	backoffStrategy := backoff.NewExponentialBackOff()
	// Default setting is to 1.5x the time interval for every failure
	backoffStrategy.InitialInterval = 1 * time.Second
	backoffStrategy.MaxInterval = 5 * time.Second
	backoffStrategy.MaxElapsedTime = 15 * time.Second

	err = backoff.Retry(operation, backoffStrategy)
	if err != nil {
		return nil, fmt.Errorf("retry Maskinporten request: %w", err)
	}

	return resp, nil
}

const clientNameBasePrefix = "altinnstudiooperator-"

// parseClientNamePrefix extracts service owner and environment from a client name.
// Client names follow pattern: altinnstudiooperator-{serviceOwner}-{environment}-{appId}.
func parseClientNamePrefix(clientName string) (serviceOwner, environment string, ok bool) {
	if !strings.HasPrefix(clientName, clientNameBasePrefix) {
		return "", "", false
	}

	remainder := strings.TrimPrefix(clientName, clientNameBasePrefix)
	parts := strings.SplitN(remainder, "-", 3)
	if len(parts) < 2 {
		return "", "", false
	}

	return parts[0], parts[1], true
}

func mapKeys(m map[string]struct{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
