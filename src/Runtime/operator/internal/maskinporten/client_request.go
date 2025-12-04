package maskinporten

// AddClientRequest represents the request for creating a new client
type AddClientRequest struct {
	// Id på klient, må være unik. Blir autogenerert ved opprettelse av klient om den ikke er spesifikt satt
	ClientId *string `json:"client_id,omitempty"`

	// Navn på klient, blir vist ved innlogging
	ClientName *string `json:"client_name,omitempty"`

	// Klienten sitt organisasjonsnummer. Må stemme med autentisert avsender, eller avsender må være leverandør med scopet idporten:dcr.supplier.
	ClientOrgno *string `json:"client_orgno,omitempty"`

	// Leverandøren sitt organisasjonsnummer. Skal kun settes hvis avsender har idporten:dcr.supplier og client_orgno er satt til noe annet enn avsenders orgno
	SupplierOrgno *string `json:"supplier_orgno,omitempty"`

	// Beskrivelse av klienten, ikke synlig for innbyggere, men blir lagret i Digdirs støttesystemer
	Description *string `json:"description,omitempty"`

	// Angir om klienten er aktiv eller ikke. Inaktive klienter vil ikke bli synkroniseret til ID-porten/maskinporten/ansattporten. Settes default til true
	Active *bool `json:"active,omitempty"`

	// Applikasjonstype
	ApplicationType *ApplicationType `json:"application_type,omitempty"`

	// Integrasjonstype
	IntegrationType *IntegrationType `json:"integration_type,omitempty"`

	// Liste over scopes som klienten kan forespørre. For OpenID Connect er aktuelle scopes openid og profile. For API-sikring, ta kontakt med oss
	Scopes []string `json:"scopes,omitempty"`

	// Tillatte Grant Types for klient. Implicit skal ikke tas i bruk av nye klienter(deprecated).
	GrantTypes []GrantType `json:"grant_types,omitempty"`

	// Autentiseringsmetode for klient. None anbefales for klienter som kjører i nettleser eller på mobil
	TokenEndpointAuthMethod *TokenEndpointAuthMethod `json:"token_endpoint_auth_method,omitempty"`

	// Levetid i sekunder for utstedt refresh_token.
	RefreshTokenLifetime *int64 `json:"refresh_token_lifetime,omitempty"`

	// Ved REUSE kan refresh_token benyttes flere ganger. Ved ONETIME kan refresh_token kun benyttes en gang.
	RefreshTokenUsage *RefreshTokenUsage `json:"refresh_token_usage,omitempty"`

	// Levetid i sekunder for utstedt access_token.
	AccessTokenLifetime *int64 `json:"access_token_lifetime,omitempty"`

	// Levetid for registrert autorisasjon i sekunder. I en OpenID Connect sammenheng vil dette være tilgangen til userinfo-endepunktet.
	AuthorizationLifetime *int64 `json:"authorization_lifetime,omitempty"`

	LogoUri *string `json:"logo_uri,omitempty"`

	// Liste over gyldige url'er som vi kan redirecte tilbake til etter vellykket autorisasjonsforespørsel
	RedirectUris []string `json:"redirect_uris,omitempty"`

	// Liste over url'er som vi redirecter til etter fullført utlogging
	PostLogoutRedirectUris []string `json:"post_logout_redirect_uris,omitempty"`

	// Flagg som bestemmer om parameterne for issuer og sesjons-id skal sendes med frontchannel_logout_uri
	FrontchannelLogoutSessionRequired *bool `json:"frontchannel_logout_session_required,omitempty"`

	// URL som vi sender request til ved utlogging trigget av annen klient i samme sesjon
	FrontchannelLogoutUri *string `json:"frontchannel_logout_uri,omitempty"`

	// Flagg for å disable sso. Dette vil gjøre at brukeren må logge inn på nytt for din klient. Dette er kun relevant for OpenID Connect. Om ikke satt, vil default være false for ID-porten og true for Ansattporten
	SsoDisabled *bool `json:"sso_disabled,omitempty"`

	// Code challenge method for PKCE. Gyldige verdier er none eller S256. Dette er kun relevant for OpenID Connect. Om ikke satt, vil default bli S256.
	CodeChallengeMethod *CodeChallengeMethod `json:"code_challenge_method,omitempty"`
}

// UpdateClientRequest represents the request for updating a client
type UpdateClientRequest struct {
	// Id på klient som skal oppdateres
	ClientId *string `json:"client_id,omitempty"`

	// Navn på klient, blir vist ved innlogging
	ClientName *string `json:"client_name,omitempty"`

	// Klienten sitt organisasjonsnummer. Må stemme med autentisert avsender, eller avsender må være leverandør med scopet idporten:dcr.supplier.
	ClientOrgno *string `json:"client_orgno,omitempty"`

	// Leverandøren sitt organisasjonsnummer. Skal kun settes hvis avsender har idporten:dcr.supplier og client_orgno er satt til noe annet enn avsenders orgno
	SupplierOrgno *string `json:"supplier_orgno,omitempty"`

	// Beskrivelse av klienten, ikke synlig for innbyggere, men blir lagret i Digdirs støttesystemer
	Description *string `json:"description,omitempty"`

	// Angir om klienten er aktiv eller ikke. Inaktive klienter vil ikke bli synkroniseret til ID-porten/maskinporten/ansattporten. Settes default til true
	Active *bool `json:"active,omitempty"`

	// Applikasjonstype
	ApplicationType *ApplicationType `json:"application_type,omitempty"`

	// Integrasjonstype
	IntegrationType *IntegrationType `json:"integration_type,omitempty"`

	// Liste over scopes som klienten kan forespørre. For OpenID Connect er aktuelle scopes openid og profile. For API-sikring, ta kontakt med oss
	Scopes []string `json:"scopes,omitempty"`

	// Tillatte Grant Types for klient. Implicit skal ikke tas i bruk av nye klienter(deprecated).
	GrantTypes []GrantType `json:"grant_types,omitempty"`

	// Autentiseringsmetode for klient. None anbefales for klienter som kjører i nettleser eller på mobil
	TokenEndpointAuthMethod *TokenEndpointAuthMethod `json:"token_endpoint_auth_method,omitempty"`

	// Levetid i sekunder for utstedt refresh_token.
	RefreshTokenLifetime *int64 `json:"refresh_token_lifetime,omitempty"`

	// Ved REUSE kan refresh_token benyttes flere ganger. Ved ONETIME kan refresh_token kun benyttes en gang.
	RefreshTokenUsage *RefreshTokenUsage `json:"refresh_token_usage,omitempty"`

	// Levetid i sekunder for utstedt access_token.
	AccessTokenLifetime *int64 `json:"access_token_lifetime,omitempty"`

	// Levetid for registrert autorisasjon i sekunder. I en OpenID Connect sammenheng vil dette være tilgangen til userinfo-endepunktet.
	AuthorizationLifetime *int64 `json:"authorization_lifetime,omitempty"`

	LogoUri *string `json:"logo_uri,omitempty"`

	// Liste over gyldige url'er som vi kan redirecte tilbake til etter vellykket autorisasjonsforespørsel
	RedirectUris []string `json:"redirect_uris,omitempty"`

	// Liste over url'er som vi redirecter til etter fullført utlogging
	PostLogoutRedirectUris []string `json:"post_logout_redirect_uris,omitempty"`

	// Flagg som bestemmer om parameterne for issuer og sesjons-id skal sendes med frontchannel_logout_uri
	FrontchannelLogoutSessionRequired *bool `json:"frontchannel_logout_session_required,omitempty"`

	// URL som vi sender request til ved utlogging trigget av annen klient i samme sesjon
	FrontchannelLogoutUri *string `json:"frontchannel_logout_uri,omitempty"`

	// Flagg for å disable sso. Dette vil gjøre at brukeren må logge inn på nytt for din klient. Dette er kun relevant for OpenID Connect. Om ikke satt, vil default være false for ID-porten og true for Ansattporten
	SsoDisabled *bool `json:"sso_disabled,omitempty"`

	// Code challenge method for PKCE. Gyldige verdier er none eller S256. Dette er kun relevant for OpenID Connect. Om ikke satt, vil default bli S256.
	CodeChallengeMethod *CodeChallengeMethod `json:"code_challenge_method,omitempty"`
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
