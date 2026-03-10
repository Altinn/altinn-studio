package maskinporten

// AddClientRequest represents the request for creating a new client.
type AddClientRequest struct {
	TokenEndpointAuthMethod           *TokenEndpointAuthMethod `json:"token_endpoint_auth_method,omitempty"`
	RefreshTokenLifetime              *int64                   `json:"refresh_token_lifetime,omitempty"`
	ClientOrgno                       *string                  `json:"client_orgno,omitempty"`
	SupplierOrgno                     *string                  `json:"supplier_orgno,omitempty"`
	Description                       *string                  `json:"description,omitempty"`
	Active                            *bool                    `json:"active,omitempty"`
	ApplicationType                   *ApplicationType         `json:"application_type,omitempty"`
	IntegrationType                   *IntegrationType         `json:"integration_type,omitempty"`
	CodeChallengeMethod               *CodeChallengeMethod     `json:"code_challenge_method,omitempty"`
	RefreshTokenUsage                 *RefreshTokenUsage       `json:"refresh_token_usage,omitempty"`
	ClientName                        *string                  `json:"client_name,omitempty"`
	ClientId                          *string                  `json:"client_id,omitempty"`
	SsoDisabled                       *bool                    `json:"sso_disabled,omitempty"`
	AccessTokenLifetime               *int64                   `json:"access_token_lifetime,omitempty"`
	AuthorizationLifetime             *int64                   `json:"authorization_lifetime,omitempty"`
	LogoUri                           *string                  `json:"logo_uri,omitempty"`
	FrontchannelLogoutUri             *string                  `json:"frontchannel_logout_uri,omitempty"`
	FrontchannelLogoutSessionRequired *bool                    `json:"frontchannel_logout_session_required,omitempty"`
	PostLogoutRedirectUris            []string                 `json:"post_logout_redirect_uris,omitempty"`
	RedirectUris                      []string                 `json:"redirect_uris,omitempty"`
	GrantTypes                        []GrantType              `json:"grant_types,omitempty"`
	Scopes                            []string                 `json:"scopes,omitempty"`
}

// UpdateClientRequest represents the request for updating a client.
type UpdateClientRequest struct {
	TokenEndpointAuthMethod           *TokenEndpointAuthMethod `json:"token_endpoint_auth_method,omitempty"`
	RefreshTokenLifetime              *int64                   `json:"refresh_token_lifetime,omitempty"`
	ClientOrgno                       *string                  `json:"client_orgno,omitempty"`
	SupplierOrgno                     *string                  `json:"supplier_orgno,omitempty"`
	Description                       *string                  `json:"description,omitempty"`
	Active                            *bool                    `json:"active,omitempty"`
	ApplicationType                   *ApplicationType         `json:"application_type,omitempty"`
	IntegrationType                   *IntegrationType         `json:"integration_type,omitempty"`
	CodeChallengeMethod               *CodeChallengeMethod     `json:"code_challenge_method,omitempty"`
	RefreshTokenUsage                 *RefreshTokenUsage       `json:"refresh_token_usage,omitempty"`
	ClientName                        *string                  `json:"client_name,omitempty"`
	ClientId                          *string                  `json:"client_id,omitempty"`
	SsoDisabled                       *bool                    `json:"sso_disabled,omitempty"`
	AccessTokenLifetime               *int64                   `json:"access_token_lifetime,omitempty"`
	AuthorizationLifetime             *int64                   `json:"authorization_lifetime,omitempty"`
	LogoUri                           *string                  `json:"logo_uri,omitempty"`
	FrontchannelLogoutUri             *string                  `json:"frontchannel_logout_uri,omitempty"`
	FrontchannelLogoutSessionRequired *bool                    `json:"frontchannel_logout_session_required,omitempty"`
	PostLogoutRedirectUris            []string                 `json:"post_logout_redirect_uris,omitempty"`
	RedirectUris                      []string                 `json:"redirect_uris,omitempty"`
	GrantTypes                        []GrantType              `json:"grant_types,omitempty"`
	Scopes                            []string                 `json:"scopes,omitempty"`
}

type ApplicationType string

const (
	ApplicationTypeWeb     ApplicationType = "web"
	ApplicationTypeBrowser ApplicationType = "browser"
	ApplicationTypeNative  ApplicationType = "native"
)

type IntegrationType string

const (
	IntegrationTypeAnsattporten  IntegrationType = "ansattporten"
	IntegrationTypeApiKlient     IntegrationType = "api_klient"
	IntegrationTypeEformidling   IntegrationType = "eformidling"
	IntegrationTypeIdporten      IntegrationType = "idporten"
	IntegrationTypeIdportenSaml2 IntegrationType = "idporten_saml2"
	IntegrationTypeKrr           IntegrationType = "krr"
	IntegrationTypeMaskinporten  IntegrationType = "maskinporten"
)

type GrantType string

const (
	GrantTypeAuthorizationCode GrantType = "authorization_code"
	GrantTypeImplicit          GrantType = "implicit"
	GrantTypeRefreshToken      GrantType = "refresh_token"
	GrantTypeJwtBearer         GrantType = "urn:ietf:params:oauth:grant-type:jwt-bearer"
)

type TokenEndpointAuthMethod string

const (
	TokenEndpointAuthMethodClientSecretPost  TokenEndpointAuthMethod = "client_secret_post"
	TokenEndpointAuthMethodClientSecretBasic TokenEndpointAuthMethod = "client_secret_basic"
	TokenEndpointAuthMethodPrivateKeyJwt     TokenEndpointAuthMethod = "private_key_jwt"
	TokenEndpointAuthMethodNone              TokenEndpointAuthMethod = "none"
)

type RefreshTokenUsage string

const (
	RefreshTokenUsageReuse   RefreshTokenUsage = "REUSE"
	RefreshTokenUsageOnetime RefreshTokenUsage = "ONETIME"
)

type CodeChallengeMethod string

const (
	CodeChallengeMethodNone CodeChallengeMethod = "none"
	CodeChallengeMethodS256 CodeChallengeMethod = "S256"
)
