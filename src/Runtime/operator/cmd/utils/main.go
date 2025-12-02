package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/orgs"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
	"github.com/go-jose/go-jose/v4"
	"github.com/jonboulle/clockwork"
)

type setupResult struct {
	ctx           context.Context
	config        *config.Config
	operatorCtx   *operatorcontext.Context
	client        *maskinporten.HttpApiClient
	cryptoService *crypto.CryptoService
}

const (
	subcommandClient      = "client"
	subcommandToken       = "token"
	subcommandClientToken = "client-token"
	subcommandClients     = "clients"
	subcommandJwk         = "jwk"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: %s <command> <subcommand> [options]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Commands:\n")
		fmt.Fprintf(os.Stderr, "  get     Get resources (token, client-token, clients)\n")
		fmt.Fprintf(os.Stderr, "  create  Create resources (jwk, client)\n")
		fmt.Fprintf(os.Stderr, "  update  Update resources (client)\n")
		fmt.Fprintf(os.Stderr, "  delete  Delete resources (client)\n")
		fmt.Fprintf(os.Stderr, "  init    Initialize resources (env)\n")
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "get":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: %s get <subcommand> [options]\n", os.Args[0])
			fmt.Fprintf(os.Stderr, "Subcommands:\n")
			fmt.Fprintf(os.Stderr, "  token         Get a Maskinporten access token (using env file credentials)\n")
			fmt.Fprintf(os.Stderr, "  client-token  Get a Maskinporten access token (using provided client-id and jwk)\n")
			fmt.Fprintf(os.Stderr, "  clients       List Maskinporten clients\n")
			os.Exit(1)
		}

		subcommand := os.Args[2]
		switch subcommand {
		case subcommandToken:
			getToken()
		case subcommandClientToken:
			getClientToken()
		case subcommandClients:
			getClients()
		default:
			fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n", subcommand)
			os.Exit(1)
		}
	case "create":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: %s create <subcommand> [options]\n", os.Args[0])
			fmt.Fprintf(os.Stderr, "Subcommands:\n")
			fmt.Fprintf(os.Stderr, "  jwk     Create a JSON Web Key Set\n")
			fmt.Fprintf(os.Stderr, "  client  Create a Maskinporten client\n")
			os.Exit(1)
		}

		subcommand := os.Args[2]
		switch subcommand {
		case subcommandJwk:
			createJwk()
		case subcommandClient:
			createClient()
		default:
			fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n", subcommand)
			os.Exit(1)
		}
	case "delete":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: %s delete <subcommand> [options]\n", os.Args[0])
			fmt.Fprintf(os.Stderr, "Subcommands:\n")
			fmt.Fprintf(os.Stderr, "  client  Delete a Maskinporten client\n")
			os.Exit(1)
		}

		subcommand := os.Args[2]
		switch subcommand {
		case subcommandClient:
			deleteClient()
		default:
			fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n", subcommand)
			os.Exit(1)
		}
	case "update":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: %s update <subcommand> [options]\n", os.Args[0])
			fmt.Fprintf(os.Stderr, "Subcommands:\n")
			fmt.Fprintf(os.Stderr, "  client  Update a Maskinporten client\n")
			os.Exit(1)
		}

		subcommand := os.Args[2]
		switch subcommand {
		case subcommandClient:
			updateClient()
		default:
			fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n", subcommand)
			os.Exit(1)
		}
	case "init":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: %s init <subcommand> [options]\n", os.Args[0])
			fmt.Fprintf(os.Stderr, "Subcommands:\n")
			fmt.Fprintf(os.Stderr, "  env  Initialize Azure Key Vault secrets for an environment\n")
			os.Exit(1)
		}

		subcommand := os.Args[2]
		switch subcommand {
		case "env":
			initEnv()
		default:
			fmt.Fprintf(os.Stderr, "Unknown subcommand: %s\n", subcommand)
			os.Exit(1)
		}
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
		os.Exit(1)
	}
}

func getToken() {
	fs := flag.NewFlagSet("get token", flag.ExitOnError)
	var env string
	var verbose bool
	fs.StringVar(&env, "env", "at22", "Environment name (will load <env>.env file)")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	envFile := env + ".env"
	setup, err := setupMaskinportenClient(env, envFile, false)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Authority URL: %s\n", setup.config.MaskinportenApi.AuthorityUrl)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", setup.config.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Client ID: %s\n", setup.config.MaskinportenApi.ClientId)
		fmt.Fprintf(os.Stderr, "Scope: %s\n", setup.config.MaskinportenApi.Scope)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	tokenResponse, err := setup.client.GetAccessToken(setup.ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get access token: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(tokenResponse.AccessToken)
}

func getClientToken() {
	fs := flag.NewFlagSet("get client-token", flag.ExitOnError)
	var env string
	var clientID string
	var jwkStr string
	var scope string
	var verbose bool
	fs.StringVar(&env, "env", "at22", "Environment name (for authority URL lookup)")
	fs.StringVar(&clientID, "client-id", "", "Maskinporten client ID (required)")
	fs.StringVar(&jwkStr, "jwk", "", "Private JWK as JSON string (required)")
	fs.StringVar(&scope, "scope", "", "Scope(s) to request (required)")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	if clientID == "" {
		fmt.Fprintf(os.Stderr, "--client-id flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	if jwkStr == "" {
		fmt.Fprintf(os.Stderr, "--jwk flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	if scope == "" {
		fmt.Fprintf(os.Stderr, "--scope flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	// Load config to get authority URL
	envFile := env + ".env"
	setup, err := setupMaskinportenClient(env, envFile, false)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Authority URL: %s\n", setup.config.MaskinportenApi.AuthorityUrl)
		fmt.Fprintf(os.Stderr, "Client ID: %s\n", clientID)
		fmt.Fprintf(os.Stderr, "Scope: %s\n", scope)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Create a config with the provided credentials
	clientConfig := &config.Config{
		MaskinportenApi: config.MaskinportenApiConfig{
			ClientId:       clientID,
			AuthorityUrl:   setup.config.MaskinportenApi.AuthorityUrl,
			SelfServiceUrl: setup.config.MaskinportenApi.SelfServiceUrl,
			Jwk:            jwkStr,
			Scope:          scope,
		},
		OrgRegistry: setup.config.OrgRegistry,
	}
	clientConfigMonitor := config.NewConfigMonitorForTesting(clientConfig)
	client, err := maskinporten.NewHttpApiClient(clientConfigMonitor, setup.operatorCtx, clockwork.NewRealClock())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create Maskinporten client: %v\n", err)
		os.Exit(1)
	}

	tokenResponse, err := client.GetAccessToken(setup.ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get access token: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(tokenResponse.AccessToken)
}

func getClients() {
	fs := flag.NewFlagSet("get clients", flag.ExitOnError)
	var env string
	var verbose bool
	var pretty bool
	fs.StringVar(&env, "env", "at22", "Environment name (will load <env>.env file)")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")
	fs.BoolVar(&pretty, "pretty", false, "Format JSON output with indentation")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	envFile := env + ".env"
	setup, err := setupMaskinportenClient(env, envFile, false)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", setup.config.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	clients, err := setup.client.GetAllClients(setup.ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get clients: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Clients fetched: %d\n", len(clients))
		fmt.Fprintf(os.Stderr, "---\n")
	}

	var output []byte
	if pretty {
		output, err = json.MarshalIndent(clients, "", "  ")
	} else {
		output, err = json.Marshal(clients)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal clients to JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(output))
}

func createClient() {
	fs := flag.NewFlagSet("create client", flag.ExitOnError)
	var env string
	var scopes string
	var appId string
	var verbose bool
	var pretty bool
	fs.StringVar(&env, "env", "at22", "Environment name (will load <env>.env file)")
	fs.StringVar(&scopes, "scopes", "", "Comma-separated list of scopes (required)")
	fs.StringVar(&appId, "app-id", "", "Application ID for client naming (required)")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")
	fs.BoolVar(&pretty, "pretty", false, "Format JSON output with indentation")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	if scopes == "" {
		fmt.Fprintf(os.Stderr, "--scopes flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	if appId == "" {
		fmt.Fprintf(os.Stderr, "--app-id flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	envFile := env + ".env"
	setup, err := setupMaskinportenClient(env, envFile, true)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", setup.config.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Service Owner ID: %s\n", setup.operatorCtx.ServiceOwner.Id)
		fmt.Fprintf(os.Stderr, "Service Owner Org No: %s\n", setup.operatorCtx.ServiceOwner.OrgNo)
		fmt.Fprintf(os.Stderr, "Environment: %s\n", setup.operatorCtx.Environment)
		fmt.Fprintf(os.Stderr, "App ID: %s\n", appId)
		fmt.Fprintf(os.Stderr, "Scopes: %s\n", scopes)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Create JWKS
	notAfter := time.Now().Add(time.Hour * 24 * 365)
	certSubject := crypto.CertSubject{
		Organization:       setup.operatorCtx.ServiceOwner.OrgName,
		OrganizationalUnit: setup.operatorCtx.ServiceOwner.Id,
		CommonName:         appId,
	}
	jwks, err := setup.cryptoService.CreateJwks(certSubject, notAfter)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create JWKS: %v\n", err)
		os.Exit(1)
	}

	// Build client request (matching operator behavior from client_state.go)
	integrationType := maskinporten.IntegrationTypeMaskinporten
	appType := maskinporten.ApplicationTypeWeb
	tokenEndpointMethod := maskinporten.TokenEndpointAuthMethodPrivateKeyJwt
	clientName := maskinporten.GetFullClientName(setup.operatorCtx, appId)
	description := fmt.Sprintf(
		"Altinn Studio Operator managed client for %s/%s/%s",
		setup.operatorCtx.ServiceOwner.Id,
		setup.operatorCtx.Environment,
		appId,
	)

	scopeList := strings.Split(scopes, ",")
	for i := range scopeList {
		scopeList[i] = strings.TrimSpace(scopeList[i])
	}

	req := &maskinporten.AddClientRequest{
		ClientName:              &clientName,
		Description:             &description,
		ClientOrgno:             &setup.operatorCtx.ServiceOwner.OrgNo,
		GrantTypes:              []maskinporten.GrantType{maskinporten.GrantTypeJwtBearer},
		Scopes:                  scopeList,
		IntegrationType:         &integrationType,
		ApplicationType:         &appType,
		TokenEndpointAuthMethod: &tokenEndpointMethod,
	}

	publicJwks, err := jwks.ToPublic()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get public JWKS: %v\n", err)
		os.Exit(1)
	}
	resp, err := setup.client.CreateClient(setup.ctx, req, publicJwks)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create Maskinporten client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Client created: %s\n", resp.ClientId)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Output the client response
	var respJson []byte
	if pretty {
		respJson, err = json.MarshalIndent(resp, "", "  ")
	} else {
		respJson, err = json.Marshal(resp)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal response to JSON: %v\n", err)
		os.Exit(1)
	}

	// Output the private JWKS for the user to save
	jwk := jwks.Keys[0]
	var jwkJson []byte
	if pretty {
		jwkJson, err = json.MarshalIndent(jwk, "", "  ")
	} else {
		jwkJson, err = json.Marshal(jwk)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal JWK to JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(respJson))
	fmt.Println("---")
	fmt.Println(string(jwkJson))
}

func createJwk() {
	// Create a new flag set for the create jwk subcommand
	fs := flag.NewFlagSet("create jwk", flag.ExitOnError)
	var certOrg string
	var certOU string
	var certCN string
	var notAfterStr string
	var verbose bool
	var pretty bool
	fs.StringVar(&certOrg, "cert-org", "", "Organization for the certificate (O)")
	fs.StringVar(&certOU, "cert-ou", "", "Organizational unit for the certificate (OU)")
	fs.StringVar(&certCN, "cert-cn", "default-cert", "Common name for the certificate (CN)")
	fs.StringVar(
		&notAfterStr,
		"not-after",
		"",
		"Certificate expiration time (RFC3339 format, e.g., 2024-12-31T23:59:59Z)",
	)
	fs.BoolVar(&verbose, "verbose", false, "Print crypto configuration constants to stderr")
	fs.BoolVar(&pretty, "pretty", false, "Format JSON output with indentation")

	// Parse remaining args (skip program name, "create", "jwk")
	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	// Parse the notAfter time
	var notAfter time.Time
	if notAfterStr == "" {
		// Default to 1 year from now
		notAfter = time.Now().Add(time.Hour * 24 * 365)
	} else {
		notAfter, err = time.Parse(time.RFC3339, notAfterStr)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to parse not-after time: %v\n", err)
			fmt.Fprintf(os.Stderr, "Expected RFC3339 format, e.g., 2024-12-31T23:59:59Z\n")
			os.Exit(1)
		}
	}

	_, cryptoService := setupBaseServices()

	certSubject := crypto.CertSubject{
		Organization:       certOrg,
		OrganizationalUnit: certOU,
		CommonName:         certCN,
	}

	// Print crypto constants if verbose
	if verbose {
		fmt.Fprintf(os.Stderr, "Crypto configuration:\n")
		fmt.Fprintf(os.Stderr, "Signature Algorithm: %s\n", crypto.DefaultSignatureAlgorithmName())
		fmt.Fprintf(os.Stderr, "X.509 Signature Algorithm: %v\n", crypto.DefaultX509SignatureAlgo)
		fmt.Fprintf(os.Stderr, "Key Size (bits): %d\n", crypto.DefaultKeySizeBits)
		fmt.Fprintf(os.Stderr, "Certificate Subject: O=%s, OU=%s, CN=%s\n", certOrg, certOU, certCN)
		fmt.Fprintf(os.Stderr, "Certificate Not After: %s\n", notAfter.Format(time.RFC3339))
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Create JWKS
	jwks, err := cryptoService.CreateJwks(certSubject, notAfter)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create JWKS: %v\n", err)
		os.Exit(1)
	}

	// Output the JWKS as JSON
	var jwkJson []byte
	var publicJwkJson []byte
	jwk := jwks.Keys[0]
	publicJwk := jwk.Public()
	if pretty {
		jwkJson, err = json.MarshalIndent(jwk, "", "  ")
	} else {
		jwkJson, err = json.Marshal(jwk)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal JWK to JSON: %v\n", err)
		os.Exit(1)
	}
	if pretty {
		publicJwkJson, err = json.MarshalIndent(publicJwk, "", "  ")
	} else {
		publicJwkJson, err = json.Marshal(publicJwk)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal public JWK to JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(jwkJson))
	fmt.Println("---")
	fmt.Println(string(publicJwkJson))
}

func deleteClient() {
	fs := flag.NewFlagSet("delete client", flag.ExitOnError)
	var env string
	var clientID string
	var verbose bool
	fs.StringVar(&env, "env", "at22", "Environment name (will load <env>.env file)")
	fs.StringVar(&clientID, "client-id", "", "Maskinporten client ID to delete")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	if clientID == "" {
		fmt.Fprintf(os.Stderr, "--client-id flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	envFile := env + ".env"
	setup, err := setupMaskinportenClient(env, envFile, false)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", setup.config.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Deleting client ID: %s\n", clientID)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	if err := setup.client.DeleteClient(setup.ctx, clientID); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to delete client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Client deleted: %s\n", clientID)
	}

	fmt.Println(clientID)
}

func updateClient() {
	fs := flag.NewFlagSet("update client", flag.ExitOnError)
	var env string
	var clientID string
	var scopes string
	var verbose bool
	var pretty bool
	fs.StringVar(&env, "env", "at22", "Environment name (will load <env>.env file)")
	fs.StringVar(&clientID, "client-id", "", "Maskinporten client ID to update (required)")
	fs.StringVar(&scopes, "scopes", "", "Comma-separated list of scopes (required)")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")
	fs.BoolVar(&pretty, "pretty", false, "Format JSON output with indentation")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	if clientID == "" {
		fmt.Fprintf(os.Stderr, "--client-id flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	if scopes == "" {
		fmt.Fprintf(os.Stderr, "--scopes flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	envFile := env + ".env"
	setup, err := setupMaskinportenClient(env, envFile, false)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", setup.config.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Updating client ID: %s\n", clientID)
		fmt.Fprintf(os.Stderr, "Scopes: %s\n", scopes)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// First, fetch the existing client to get all current fields
	existingClient, _, err := setup.client.GetClient(setup.ctx, clientID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get existing client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Fetched existing client: %s\n", existingClient.ClientId)
		fmt.Fprintf(os.Stderr, "Current scopes: %v\n", existingClient.Scopes)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Convert response to update request, preserving all fields
	addReq := maskinporten.MapClientResponseToAddRequest(existingClient)
	req := maskinporten.ConvertAddRequestToUpdateRequest(addReq)

	// Update only the scopes
	scopeList := strings.Split(scopes, ",")
	for i := range scopeList {
		scopeList[i] = strings.TrimSpace(scopeList[i])
	}
	req.Scopes = scopeList

	resp, err := setup.client.UpdateClient(setup.ctx, clientID, req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to update client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Client updated: %s\n", resp.ClientId)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	var output []byte
	if pretty {
		output, err = json.MarshalIndent(resp, "", "  ")
	} else {
		output, err = json.Marshal(resp)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to marshal response to JSON: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(output))
}

func initEnv() {
	fs := flag.NewFlagSet("init env", flag.ExitOnError)
	var env string
	var clientID string
	var jwkStr string
	var force bool
	var verbose bool
	fs.StringVar(&env, "env", "", "Environment name (required, e.g., at23)")
	fs.StringVar(&clientID, "client-id", "", "Maskinporten client ID (required)")
	fs.StringVar(&jwkStr, "jwk", "", "Private JWK as JSON string (required)")
	fs.BoolVar(&force, "force", false, "Overwrite existing secrets")
	fs.BoolVar(&verbose, "verbose", false, "Print verbose output")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	if env == "" {
		fmt.Fprintf(os.Stderr, "--env flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	if clientID == "" {
		fmt.Fprintf(os.Stderr, "--client-id flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	if jwkStr == "" {
		fmt.Fprintf(os.Stderr, "--jwk flag is required\n")
		fs.Usage()
		os.Exit(1)
	}

	// Validate JWK
	var jwk jose.JSONWebKey
	if err := json.Unmarshal([]byte(jwkStr), &jwk); err != nil {
		fmt.Fprintf(os.Stderr, "Invalid JWK: %v\n", err)
		os.Exit(1)
	}
	if !jwk.Valid() {
		fmt.Fprintf(os.Stderr, "Invalid JWK: key validation failed\n")
		os.Exit(1)
	}
	if !jwk.IsPublic() {
		// Good - it's a private key
	} else {
		fmt.Fprintf(os.Stderr, "Invalid JWK: must be a private key, not public\n")
		os.Exit(1)
	}

	ctx := context.Background()
	vaultURL := fmt.Sprintf("https://mpo-%s-kv.vault.azure.net/", env)

	if verbose {
		fmt.Fprintf(os.Stderr, "Key Vault URL: %s\n", vaultURL)
		fmt.Fprintf(os.Stderr, "Client ID: %s\n", clientID)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get Azure credentials: %v\n", err)
		os.Exit(1)
	}

	client, err := azsecrets.NewClient(vaultURL, cred, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create Key Vault client: %v\n", err)
		os.Exit(1)
	}

	// Check for existing secrets if not forcing
	if !force {
		if secretExists(ctx, client, "MaskinportenApi--ClientId") {
			fmt.Fprintf(os.Stderr, "Secret MaskinportenApi--ClientId already exists. Use --force to overwrite.\n")
			os.Exit(1)
		}
		if secretExists(ctx, client, "MaskinportenApi--Jwk") {
			fmt.Fprintf(os.Stderr, "Secret MaskinportenApi--Jwk already exists. Use --force to overwrite.\n")
			os.Exit(1)
		}
	}

	// Set secrets
	if err := setSecret(ctx, client, "MaskinportenApi--ClientId", clientID); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to set MaskinportenApi--ClientId: %v\n", err)
		os.Exit(1)
	}
	if verbose {
		fmt.Fprintf(os.Stderr, "Set secret: MaskinportenApi--ClientId\n")
	}

	if err := setSecret(ctx, client, "MaskinportenApi--Jwk", jwkStr); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to set MaskinportenApi--Jwk: %v\n", err)
		os.Exit(1)
	}
	if verbose {
		fmt.Fprintf(os.Stderr, "Set secret: MaskinportenApi--Jwk\n")
	}

	fmt.Printf("Successfully initialized Key Vault secrets for environment %s\n", env)
}

func secretExists(ctx context.Context, client *azsecrets.Client, name string) bool {
	_, err := client.GetSecret(ctx, name, "", nil)
	if err != nil {
		if respErr, ok := err.(*azcore.ResponseError); ok {
			if respErr.StatusCode == 404 {
				return false
			}
		}
		// Treat other errors as "don't know" - let the set operation fail with a clear error
		return false
	}
	return true
}

func setSecret(ctx context.Context, client *azsecrets.Client, name, value string) error {
	params := azsecrets.SetSecretParameters{
		Value: &value,
	}
	_, err := client.SetSecret(ctx, name, params, nil)
	return err
}

func setupMaskinportenClient(env, envFile string, withCrypto bool) (*setupResult, error) {
	ctx := context.Background()
	environment := operatorcontext.ResolveEnvironment(env)

	// Set service owner for operatorcontext.Discover
	if os.Getenv("OPERATOR_SERVICEOWNER") == "" {
		err := os.Setenv("OPERATOR_SERVICEOWNER", "ttd")
		if err != nil {
			return nil, fmt.Errorf("failed to set OPERATOR_SERVICEOWNER environment variable: %w", err)
		}
	}

	cfg, err := config.GetConfig(ctx, environment, envFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load config from %s: %w", envFile, err)
	}
	configValue := cfg.Get()

	orgRegistry, err := orgs.NewOrgRegistry(ctx, configValue.OrgRegistry.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to create OrgRegistry: %w", err)
	}
	operatorCtx, err := operatorcontext.Discover(ctx, environment, orgRegistry)
	if err != nil {
		return nil, fmt.Errorf("failed to discover operator context: %w", err)
	}

	clock, cryptoService := setupBaseServices()
	client, err := maskinporten.NewHttpApiClient(cfg, operatorCtx, clock)
	if err != nil {
		return nil, fmt.Errorf("failed to create Maskinporten client: %w", err)
	}

	result := &setupResult{
		ctx:         ctx,
		config:      configValue,
		operatorCtx: operatorCtx,
		client:      client,
	}

	if withCrypto {
		result.cryptoService = cryptoService
	}

	return result, nil
}

func setupBaseServices() (clockwork.Clock, *crypto.CryptoService) {
	clock := clockwork.NewRealClock()
	cryptoService := crypto.NewDefaultService(clock, rand.Reader)
	return clock, cryptoService
}
