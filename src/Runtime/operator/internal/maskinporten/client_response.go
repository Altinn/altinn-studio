package maskinporten

import (
	"time"

	"altinn.studio/operator/internal/crypto"
)

// ClientResponse represents the response when retrieving or creating a client
type ClientResponse struct {
	ClientId string `json:"client_id"`

	// Navn på klient, blir vist ved innlogging
	ClientName *string `json:"client_name,omitempty"`

	// Klienten sitt organisasjonsnummer.
	ClientOrgno *string `json:"client_orgno,omitempty"`

	// Leverandøren sitt organisasjonsnummer.
	SupplierOrgno *string `json:"supplier_orgno,omitempty"`

	// Beskrivelse av klienten, ikke synlig for innbyggere.
	Description *string `json:"description,omitempty"`

	Active *bool `json:"active,omitempty"`

	Created *time.Time `json:"created,omitempty"`

	LastUpdated *time.Time `json:"last_updated,omitempty"`

	// Applikasjonstype
	ApplicationType *ApplicationType `json:"application_type,omitempty"`

	// Integrasjonstype
	IntegrationType *IntegrationType `json:"integration_type,omitempty"`

	// Liste over scopes som klienten kan forespørre.
	Scopes []string `json:"scopes,omitempty"`

	// Tillatte Grant Types for klient.
	GrantTypes []GrantType `json:"grant_types,omitempty"`

	// Autentiseringsmetode for klient.
	TokenEndpointAuthMethod *TokenEndpointAuthMethod `json:"token_endpoint_auth_method,omitempty"`

	// Levetid i sekunder for utstedt refresh_token
	RefreshTokenLifetime *int64 `json:"refresh_token_lifetime,omitempty"`

	// Ved REUSE kan refresh_token benyttes flere ganger. Ved ONETIME kan refresh_token kun benyttes en gang.
	RefreshTokenUsage *RefreshTokenUsage `json:"refresh_token_usage,omitempty"`

	// Levetid i sekunder for utstedt access_token
	AccessTokenLifetime *int64 `json:"access_token_lifetime,omitempty"`

	// Levetid for registrert autorisasjon i sekunder. I en OpenID Connect sammenheng vil dette være tilgangen til userinfo-endepunktet.
	AuthorizationLifetime *int64 `json:"authorization_lifetime,omitempty"`

	OnBehalfOf []ClientOnBehalfOf `json:"onbehalfof,omitempty"`

	// Secret kan ikke settes direkte. Secret blir generert ved behov og dette feltet er kun for retur av secret
	ClientSecret *string `json:"client_secret,omitempty"`

	Jwks *crypto.Jwks `json:"jwks,omitempty"`

	// Uri til JWKS om satt. Kan kun leses ut, ikke settes.
	JwksUri *string `json:"jwks_uri,omitempty"`

	LogoUri *string `json:"logo_uri,omitempty"`

	// Liste over gyldige url'er som vi kan redirecte tilbake til etter vellykket autorisasjonsforespørsel
	RedirectUris []string `json:"redirect_uris,omitempty"`

	// Liste over url'er som vi redirecter til etter fullført utlogging
	PostLogoutRedirectUris []string `json:"post_logout_redirect_uris,omitempty"`

	// Flagg som bestemmer om parameterne for issuer og sesjons-id skal sendes med frontchannel_logout_uri
	FrontchannelLogoutSessionRequired *bool `json:"frontchannel_logout_session_required,omitempty"`

	// URL som vi sender request til ved utlogging trigget av annen klient i samme sesjon
	FrontchannelLogoutUri *string `json:"frontchannel_logout_uri,omitempty"`

	// Flagg for å disable sso. Dette vil gjøre at brukeren må logge inn på nytt for din klient. Dette er kun relevant for OpenID Connect.
	SsoDisabled *bool `json:"sso_disabled,omitempty"`

	// Code challenge method for PKCE. Gyldige verdier er none eller S256. Dette er kun relevant for OpenID Connect.
	CodeChallengeMethod *CodeChallengeMethod `json:"code_challenge_method,omitempty"`
}

// ClientOnBehalfOf represents on-behalf-of client information
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

// OidcJwksRequestResponse represents JWKS request/response
type OidcJwksRequestResponse = crypto.Jwks

// ApiError represents a single specific error
type ApiError struct {
	ErrorMessage    *string `json:"errorMessage,omitempty"`
	IsFieldError    *bool   `json:"isFieldError,omitempty"`
	ObjectName      *string `json:"objectName,omitempty"`
	FieldIdentifier *string `json:"fieldIdentifier,omitempty"`
}

// ApiErrorResponse represents a response containing information about errors from the API
type ApiErrorResponse struct {
	Status           *int32     `json:"status,omitempty"`
	Timestamp        *time.Time `json:"timestamp,omitempty"`
	CorrelationId    *string    `json:"correlation_id,omitempty"`
	Errors           []ApiError `json:"errors,omitempty"`
	Error            *string    `json:"error,omitempty"`
	ErrorDescription *string    `json:"error_description,omitempty"`
}
