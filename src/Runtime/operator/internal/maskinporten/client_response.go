package maskinporten

import (
	"time"

	"altinn.studio/operator/internal/crypto"
)

// ClientResponse represents the response when retrieving or creating a client.
type ClientResponse struct {
	RefreshTokenUsage                 *RefreshTokenUsage       `json:"refresh_token_usage,omitempty"`
	Jwks                              *crypto.Jwks             `json:"jwks,omitempty"`
	ClientOrgno                       *string                  `json:"client_orgno,omitempty"`
	SupplierOrgno                     *string                  `json:"supplier_orgno,omitempty"`
	CodeChallengeMethod               *CodeChallengeMethod     `json:"code_challenge_method,omitempty"`
	Active                            *bool                    `json:"active,omitempty"`
	Created                           *time.Time               `json:"created,omitempty"`
	LastUpdated                       *time.Time               `json:"last_updated,omitempty"`
	ApplicationType                   *ApplicationType         `json:"application_type,omitempty"`
	IntegrationType                   *IntegrationType         `json:"integration_type,omitempty"`
	SsoDisabled                       *bool                    `json:"sso_disabled,omitempty"`
	FrontchannelLogoutUri             *string                  `json:"frontchannel_logout_uri,omitempty"`
	ClientName                        *string                  `json:"client_name,omitempty"`
	FrontchannelLogoutSessionRequired *bool                    `json:"frontchannel_logout_session_required,omitempty"`
	Description                       *string                  `json:"description,omitempty"`
	AccessTokenLifetime               *int64                   `json:"access_token_lifetime,omitempty"`
	AuthorizationLifetime             *int64                   `json:"authorization_lifetime,omitempty"`
	RefreshTokenLifetime              *int64                   `json:"refresh_token_lifetime,omitempty"`
	ClientSecret                      *string                  `json:"client_secret,omitempty"`
	TokenEndpointAuthMethod           *TokenEndpointAuthMethod `json:"token_endpoint_auth_method,omitempty"`
	JwksUri                           *string                  `json:"jwks_uri,omitempty"`
	LogoUri                           *string                  `json:"logo_uri,omitempty"`
	ClientId                          string                   `json:"client_id"`
	RedirectUris                      []string                 `json:"redirect_uris,omitempty"`
	OnBehalfOf                        []ClientOnBehalfOf       `json:"onbehalfof,omitempty"`
	PostLogoutRedirectUris            []string                 `json:"post_logout_redirect_uris,omitempty"`
	GrantTypes                        []GrantType              `json:"grant_types,omitempty"`
	Scopes                            []string                 `json:"scopes,omitempty"`
}

// ClientOnBehalfOf represents on-behalf-of client information.
type ClientOnBehalfOf struct {
	// ID for onbehalfof klient. Fulle klient navn blir <client_id>::<onbehalfof_verdi>
	OnBehalfOf *string `json:"onbehalfof,omitempty"`

	// Navn på klient, blir vist ved innlogging
	Name *string `json:"name,omitempty"`

	// Klienten sitt organisasjonsnummer
	Orgno *string `json:"orgno,omitempty"`

	// Organisasjonsnavnet som tilhører organisasjonsnummeret
	OrganizationName *string `json:"organization_name,omitempty"`

	// Beskrivelse av klienten, ikke synlig for innbyggere, men blir lagret i Digdir sine støttesystemer
	Description *string `json:"description,omitempty"`

	LogoUri *string `json:"logo_uri,omitempty"`

	Created *time.Time `json:"created,omitempty"`

	LastUpdated *time.Time `json:"last_updated,omitempty"`
}

// OidcJwksRequestResponse represents JWKS request/response.
type OidcJwksRequestResponse = crypto.Jwks

// ApiError represents a single specific error.
type ApiError struct {
	ErrorMessage    *string `json:"errorMessage,omitempty"`
	IsFieldError    *bool   `json:"isFieldError,omitempty"`
	ObjectName      *string `json:"objectName,omitempty"`
	FieldIdentifier *string `json:"fieldIdentifier,omitempty"`
}

// ApiErrorResponse represents a response containing information about errors from the API.
type ApiErrorResponse struct {
	Status           *int32     `json:"status,omitempty"`
	Timestamp        *time.Time `json:"timestamp,omitempty"`
	CorrelationId    *string    `json:"correlation_id,omitempty"`
	Error            *string    `json:"error,omitempty"`
	ErrorDescription *string    `json:"error_description,omitempty"`
	Errors           []ApiError `json:"errors,omitempty"`
}
