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

	"altinn.studio/operator/internal/assert"
	"altinn.studio/operator/internal/caching"
	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/telemetry"
	"github.com/cenkalti/backoff/v4"
	"github.com/jonboulle/clockwork"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

type WellKnownResponse struct {
	Issuer                                     string   `json:"issuer"`
	TokenEndpoint                              string   `json:"token_endpoint"`
	JwksURI                                    string   `json:"jwks_uri"`
	TokenEndpointAuthMethodsSupported          []string `json:"token_endpoint_auth_methods_supported"`
	GrantTypesSupported                        []string `json:"grant_types_supported"`
	TokenEndpointAuthSigningAlgValuesSupported []string `json:"token_endpoint_auth_signing_alg_values_supported"`
}

// This client calls necessary APIs in the Maskinporten authority service
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
	configMonitor *config.ConfigMonitor
	context       *operatorcontext.Context
	client        http.Client
	hydrated      bool
	wellKnown     caching.CachedAtom[WellKnownResponse]
	accessToken   caching.CachedAtom[TokenResponse]
	tracer        trace.Tracer
	clock         clockwork.Clock

	// Service owner + environment
	clientNameFullPrefix string
	// Service owner only (e.g. ttd will have clients in the same environment)
	clientNameServiceOwnerPrefix string
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
		return nil, err
	}

	apiClient := &HttpApiClient{
		configMonitor: configMonitor,
		context:       opCtx,
		client:        http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)},
		hydrated:      false,
		tracer:        otel.Tracer(telemetry.ServiceName),
		clock:         clock,

		clientNameFullPrefix:         getClientNameFullPrefix(opCtx),
		clientNameServiceOwnerPrefix: getClientNameServiceOwnerPrefix(opCtx),
	}

	apiClient.wellKnown = caching.NewCachedAtom(5*time.Minute, clock, apiClient.wellKnownFetcher)
	apiClient.accessToken = caching.NewCachedAtom(1*time.Minute, clock, apiClient.accessTokenFetcher)

	return apiClient, nil
}

// getConfig returns the current MaskinportenApi config from the monitor.
func (c *HttpApiClient) getConfig() *config.MaskinportenApiConfig {
	return &c.configMonitor.Get().MaskinportenApi
}

// getJwk parses and returns the current JWK from config.
func (c *HttpApiClient) getJwk() (*crypto.Jwk, error) {
	cfg := c.getConfig()
	jwk := crypto.Jwk{}
	if err := json.Unmarshal([]byte(cfg.Jwk), &jwk); err != nil {
		return nil, err
	}
	return &jwk, nil
}

func (c *HttpApiClient) createReq(
	ctx context.Context,
	endpoint string,
	method string,
	body io.Reader,
) (*http.Request, error) {
	// Fetch the access token from the cache.
	tokenResponse, err := c.accessToken.Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	// Prepare the request.
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create new request: %w", err)
	}

	// Set necessary headers.
	req.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)

	return req, nil
}

func (c *HttpApiClient) GetWellKnownConfiguration(ctx context.Context) (*WellKnownResponse, error) {
	ctx, span := c.tracer.Start(ctx, "GetWellKnownConfiguration")
	defer span.End()

	return c.wellKnown.Get(ctx)
}

func (c *HttpApiClient) GetAccessToken(ctx context.Context) (*TokenResponse, error) {
	ctx, span := c.tracer.Start(ctx, "GetAccessToken")
	defer span.End()

	return c.accessToken.Get(ctx)
}

func (c *HttpApiClient) GetAllClients(ctx context.Context) ([]ClientResponse, error) {
	ctx, span := c.tracer.Start(ctx, "GetAllClients")
	defer span.End()

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients")

	if err != nil {
		return nil, err
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

	if resp.StatusCode != 200 {
		return nil, c.handleErrorResponse(resp)
	}

	dtos, err := deserialize[[]ClientResponse](resp)
	if err != nil {
		return nil, err
	}

	if dtos == nil {
		return nil, fmt.Errorf("no clients found")
	}

	result := make([]ClientResponse, 0, 16)
	for _, cl := range dtos {
		if cl.ClientId == "" {
			return nil, fmt.Errorf("found client with empty ID")
		}
		if c.context.ServiceOwnerId == "digdir" && cl.ClientId == c.getConfig().ClientId {
			// If this operator is running as digdir, the supplier client is also defined there
			// so we need to skip it (we should never change or process the supplier client from here)
			// TODO: unless we want to rotate JWKS automatically from the operator? o_O
			continue
		}
		if cl.ClientName == nil {
			return nil, fmt.Errorf("client with ID %s has no name", cl.ClientId)
		}
		if !strings.HasPrefix(*cl.ClientName, c.clientNameFullPrefix) {
			if !strings.HasPrefix(*cl.ClientName, c.clientNameServiceOwnerPrefix) {
				// Client for a completely different serviceowner, we need to error, something unexpected happened
				return nil, fmt.Errorf("client with ID %s has invalid name (expected our prefix): %s", cl.ClientId, *cl.ClientName)
			}
			// Client for same serviceowner, different environment - skip (e.g. ttd at22, at23, at24 which use the same Maskinporten env)
			continue
		}

		result = append(result, cl)
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
		return nil, errors.New("missing ID on client info")
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId, "jwks")
	if err != nil {
		return nil, err
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

	if resp.StatusCode != 200 {
		return nil, c.handleErrorResponse(resp)
	}

	jwks, err := deserialize[crypto.Jwks](resp)
	if err != nil {
		return nil, err
	}
	// TODO: what is the invariant here?
	// assert.That(len(jwks.Keys) > 0, "getClientJwks: JWKS must have at least one key", "clientId", clientId)

	return &jwks, nil
}

var ErrFailedToCreateJwks = errors.New("created Maskinporten client, but failed to create associated JWKS")
var ErrClientNotFound = errors.New("maskinporten client not found")

func (c *HttpApiClient) CreateClient(
	ctx context.Context,
	client *AddClientRequest,
	jwks *crypto.Jwks,
) (*ClientResponse, error) {
	ctx, span := c.tracer.Start(ctx, "CreateClient")
	defer span.End()

	if client.ClientName == nil || *client.ClientName == "" {
		return nil, errors.New("CreateClient: client name must be provided")
	}
	if !strings.HasPrefix(*client.ClientName, c.clientNameFullPrefix) {
		return nil, fmt.Errorf(
			"CreateClient: client name must start with expected prefix: %s",
			c.clientNameFullPrefix,
		)
	}

	if jwks == nil {
		return nil, errors.New("can't create maskinporten client without JWKS initialized")
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients")
	if err != nil {
		return nil, err
	}

	buf, err := json.Marshal(client)
	if err != nil {
		return nil, err
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
	if resp.StatusCode != 201 {
		return nil, c.handleErrorResponse(resp)
	}

	result, err := deserialize[ClientResponse](resp)
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
		return nil, fmt.Errorf("error creating client: %w, %w", ErrFailedToCreateJwks, err)
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
		return nil, fmt.Errorf(
			"tried to update maskinporten client with empty ID for client name: %s",
			clientName,
		)
	}

	if client.ClientName == nil || *client.ClientName == "" {
		return nil, errors.New("UpdateClient: client name must be provided")
	}
	if !strings.HasPrefix(*client.ClientName, c.clientNameFullPrefix) {
		return nil, fmt.Errorf(
			"UpdateClient: client name must start with expected prefix: %s",
			c.clientNameFullPrefix,
		)
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId)
	if err != nil {
		return nil, err
	}

	buf, err := json.Marshal(client)
	if err != nil {
		return nil, err
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

	if resp.StatusCode != 200 {
		return nil, c.handleErrorResponse(resp)
	}

	dto, err := deserialize[ClientResponse](resp)
	if err != nil {
		return nil, err
	}

	return &dto, nil
}

func (c *HttpApiClient) CreateClientJwks(ctx context.Context, clientId string, jwks *crypto.Jwks) error {
	ctx, span := c.tracer.Start(ctx, "CreateClientJwks")
	defer span.End()

	if clientId == "" {
		return errors.New("missing ID on client info")
	}
	if jwks == nil {
		return errors.New("can't create maskinporten client without JWKS initialized")
	}
	for _, jwk := range jwks.Keys {
		// jwk.Certificates
		if !jwk.IsPublic() {
			return fmt.Errorf("tried to upload private key JWKS to Maskinporten for: %s", clientId)
		}
	}

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId, "jwks")
	if err != nil {
		return err
	}

	buf, err := json.Marshal(&jwks)
	if err != nil {
		return err
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

	if resp.StatusCode != 201 {
		return c.handleErrorResponse(resp)
	}

	return nil
}

func (c *HttpApiClient) DeleteClient(ctx context.Context, clientId string) error {
	ctx, span := c.tracer.Start(ctx, "DeleteClient")
	defer span.End()

	endpointUrl, err := url.JoinPath(c.getConfig().SelfServiceUrl, "/api/v1/altinn/admin/clients", clientId)
	if err != nil {
		return err
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
	if resp.StatusCode != 204 {
		return c.handleErrorResponse(resp)
	}

	// Close the response body for successful responses
	defer func() { _ = resp.Body.Close() }()

	return nil
}

func (c *HttpApiClient) createGrant(ctx context.Context) (*string, error) {
	wellKnown, err := c.wellKnown.Get(ctx)
	if err != nil {
		return nil, err
	}
	assert.That(wellKnown.Issuer != "", "WellKnown.Issuer must be non-empty")

	jwk, err := c.getJwk()
	if err != nil {
		return nil, err
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
		return nil, err
	}

	return &signedToken, nil
}

func (c *HttpApiClient) accessTokenFetcher(ctx context.Context) (*TokenResponse, error) {
	grant, err := c.createGrant(ctx)
	if err != nil {
		return nil, err
	}

	endpointUrl, err := url.JoinPath(c.getConfig().AuthorityUrl, "/token")
	if err != nil {
		return nil, err
	}

	queryParams := url.Values{
		"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"},
		"assertion":  {*grant},
	}

	endpointUrl += "?" + queryParams.Encode()

	req, err := http.NewRequestWithContext(ctx, "POST", endpointUrl, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, c.handleErrorResponse(resp)
	}

	tokenResp, err := deserialize[TokenResponse](resp)
	if err != nil {
		return nil, err
	}
	assert.That(tokenResp.AccessToken != "", "TokenResponse.AccessToken must be non-empty")

	return &tokenResp, nil
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
	Scope       string `json:"scope"`
}

func (c *HttpApiClient) wellKnownFetcher(ctx context.Context) (*WellKnownResponse, error) {
	endpointUrl, err := url.JoinPath(c.getConfig().AuthorityUrl, "/.well-known/oauth-authorization-server")
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "GET", endpointUrl, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.retryableHTTPDo(req)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != 200 {
		return nil, c.handleErrorResponse(resp)
	}

	wellKnownResp, err := deserialize[WellKnownResponse](resp)
	if err != nil {
		return nil, err
	}
	return &wellKnownResp, nil
}

func deserialize[T any](resp *http.Response) (T, error) {
	// TODO: accept `result` as a pointer from outside?

	// There is not much to do about the error returned from closing the body
	// apparently this should not happen for the Closer set to the response body
	defer func() { _ = resp.Body.Close() }()

	var result T
	err := json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return result, err
	}

	return result, err
}

// handleErrorResponse attempts to parse a structured API error response, falling back to raw body if parsing fails
func (c *HttpApiClient) handleErrorResponse(resp *http.Response) error {
	defer func() { _ = resp.Body.Close() }()

	// Try to parse as structured API error response
	// var apiError ApiErrorResponse
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("HTTP %d: failed to read response body: %w", resp.StatusCode, err)
	}

	// Fallback to raw body if structured parsing failed or no error message found
	return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
}

// retryableHTTPDo performs an HTTP request with retry logic.
func (c *HttpApiClient) retryableHTTPDo(req *http.Request) (*http.Response, error) {
	var resp *http.Response
	var err error

	// TODO: different strategy??

	operation := func() error {
		// Reset body for retries - after the first attempt, req.Body is consumed
		if req.GetBody != nil {
			req.Body, err = req.GetBody()
			if err != nil {
				return backoff.Permanent(err)
			}
		}

		resp, err = c.client.Do(req)
		if err != nil {
			return err // Network error, retry.
		}
		if resp.StatusCode >= 500 { // Retrying on 5xx server errors.
			return c.handleErrorResponse(resp)
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
		return nil, err
	}

	return resp, nil
}
