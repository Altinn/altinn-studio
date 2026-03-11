package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/Azure/azure-sdk-for-go/sdk/security/keyvault/azsecrets"
	"github.com/go-jose/go-jose/v4"
	"github.com/jonboulle/clockwork"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"altinn.studio/operator/internal/orgs"
)

type setupResult struct {
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
	subcommandEnv         = "env"
	defaultCertLifetime   = 365 * 24 * time.Hour
	maskinportenClientID  = "MaskinportenApi--ClientId"
	maskinportenJWK       = "MaskinportenApi--Jwk"
)

func main() {
	if len(os.Args) < 2 {
		printRootUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "get":
		runCommandGroup(
			"get",
			[]string{
				"  token         Get a Maskinporten access token (using env file credentials)",
				"  client-token  Get a Maskinporten access token (using provided client-id and jwk)",
				"  clients       List Maskinporten clients",
			},
			map[string]func(){
				subcommandToken:       getToken,
				subcommandClientToken: getClientToken,
				subcommandClients:     getClients,
			},
		)
	case "create":
		runCommandGroup(
			"create",
			[]string{
				"  jwk     Create a JSON Web Key Set",
				"  client  Create a Maskinporten client",
			},
			map[string]func(){
				subcommandJwk:    createJwk,
				subcommandClient: createClient,
			},
		)
	case "delete":
		runCommandGroup(
			"delete",
			[]string{"  client  Delete a Maskinporten client"},
			map[string]func(){subcommandClient: deleteClient},
		)
	case "update":
		runCommandGroup(
			"update",
			[]string{"  client  Update a Maskinporten client"},
			map[string]func(){subcommandClient: updateClient},
		)
	case "init":
		runCommandGroup(
			"init",
			[]string{"  env  Initialize Azure Key Vault secrets for an environment"},
			map[string]func(){subcommandEnv: initEnv},
		)
	default:
		failf("Unknown command: %s\n", os.Args[1])
	}
}

func printRootUsage() {
	fmt.Fprintf(os.Stderr, "Usage: %s <command> <subcommand> [options]\n", os.Args[0])
	fmt.Fprintf(os.Stderr, "Commands:\n")
	fmt.Fprintf(os.Stderr, "  get     Get resources (token, client-token, clients)\n")
	fmt.Fprintf(os.Stderr, "  create  Create resources (jwk, client)\n")
	fmt.Fprintf(os.Stderr, "  update  Update resources (client)\n")
	fmt.Fprintf(os.Stderr, "  delete  Delete resources (client)\n")
	fmt.Fprintf(os.Stderr, "  init    Initialize resources (env)\n")
}

func runCommandGroup(command string, subcommands []string, handlers map[string]func()) {
	if len(os.Args) < 3 {
		fmt.Fprintf(os.Stderr, "Usage: %s %s <subcommand> [options]\n", os.Args[0], command)
		fmt.Fprintf(os.Stderr, "Subcommands:\n")
		for _, subcommand := range subcommands {
			fmt.Fprintf(os.Stderr, "%s\n", subcommand)
		}
		os.Exit(1)
	}

	handler, ok := handlers[os.Args[2]]
	if !ok {
		failf("Unknown subcommand: %s\n", os.Args[2])
	}

	handler()
}

func failf(format string, args ...any) {
	_, _ = fmt.Fprintf(os.Stderr, format, args...)
	os.Exit(1)
}

func mustParseFlags(fs *flag.FlagSet) {
	if err := fs.Parse(os.Args[3:]); err != nil {
		failf("Failed to parse flags: %v\n", err)
	}
}

func requireFlag(fs *flag.FlagSet, value, name string) {
	if value != "" {
		return
	}

	fmt.Fprintf(os.Stderr, "--%s flag is required\n", name)
	fs.Usage()
	os.Exit(1)
}

func mustMarshalJSON(v any, pretty bool, subject string) []byte {
	var (
		data []byte
		err  error
	)

	if pretty {
		data, err = json.MarshalIndent(v, "", "  ")
	} else {
		data, err = json.Marshal(v)
	}
	if err != nil {
		failf("Failed to marshal %s to JSON: %v\n", subject, err)
	}

	return data
}

func mustWriteStdout(value string) {
	_, err := fmt.Fprintln(os.Stdout, value)
	if err != nil {
		failf("Failed to write to stdout: %v\n", err)
	}
}

func splitCSV(values string) []string {
	parts := strings.Split(values, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}

	return parts
}

func parseNotAfter(notAfterStr string) time.Time {
	if notAfterStr == "" {
		return time.Now().Add(defaultCertLifetime)
	}

	notAfter, err := time.Parse(time.RFC3339, notAfterStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse not-after time: %v\n", err)
		fmt.Fprintf(os.Stderr, "Expected RFC3339 format, e.g., 2024-12-31T23:59:59Z\n")
		os.Exit(1)
	}

	return notAfter
}

func validatePrivateJWK(jwkStr string) {
	var jwk jose.JSONWebKey
	if err := json.Unmarshal([]byte(jwkStr), &jwk); err != nil {
		failf("Invalid JWK: %v\n", err)
	}
	if !jwk.Valid() {
		failf("Invalid JWK: key validation failed\n")
	}
	if jwk.IsPublic() {
		failf("Invalid JWK: must be a private key, not public\n")
	}
}

func ensureSecretAbsent(ctx context.Context, client *azsecrets.Client, secretName string) {
	if secretExists(ctx, client, secretName) {
		failf("Secret %s already exists. Use --force to overwrite.\n", secretName)
	}
}

func loadSetup(env string, withCrypto bool) (*setupResult, string) {
	envFile := env + ".env"
	setup, err := setupMaskinportenClient(env, envFile, withCrypto)
	if err != nil {
		failf("%v\n", err)
	}

	return setup, envFile
}

func createClientRequest(setup *setupResult, appID, scopes string) *maskinporten.AddClientRequest {
	integrationType := maskinporten.IntegrationTypeMaskinporten
	appType := maskinporten.ApplicationTypeWeb
	tokenEndpointMethod := maskinporten.TokenEndpointAuthMethodPrivateKeyJwt
	clientName := maskinporten.GetFullClientName(setup.operatorCtx, appID)
	description := fmt.Sprintf(
		"Altinn Studio Operator managed client for %s/%s/%s",
		setup.operatorCtx.ServiceOwner.Id,
		setup.operatorCtx.Environment,
		appID,
	)

	return &maskinporten.AddClientRequest{
		ClientName:              &clientName,
		Description:             &description,
		ClientOrgno:             &setup.operatorCtx.ServiceOwner.OrgNo,
		GrantTypes:              []maskinporten.GrantType{maskinporten.GrantTypeJwtBearer},
		Scopes:                  splitCSV(scopes),
		IntegrationType:         &integrationType,
		ApplicationType:         &appType,
		TokenEndpointAuthMethod: &tokenEndpointMethod,
	}
}

func mustKeyVaultClient(vaultURL string) *azsecrets.Client {
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		failf("Failed to get Azure credentials: %v\n", err)
	}

	client, err := azsecrets.NewClient(vaultURL, cred, nil)
	if err != nil {
		failf("Failed to create Key Vault client: %v\n", err)
	}

	return client
}

func getToken() {
	fs := flag.NewFlagSet("get token", flag.ExitOnError)
	var env string
	var verbose bool
	fs.StringVar(&env, "env", "at22", "Environment name (will load <env>.env file)")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")

	mustParseFlags(fs)

	setup, envFile := loadSetup(env, false)

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Authority URL: %s\n", setup.config.MaskinportenApi.AuthorityUrl)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", setup.config.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Client ID: %s\n", setup.config.MaskinportenApi.ClientId)
		fmt.Fprintf(os.Stderr, "Scope: %s\n", setup.config.MaskinportenApi.Scope)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	tokenResponse, err := setup.client.GetAccessToken(context.Background())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get access token: %v\n", err)
		os.Exit(1)
	}

	mustWriteStdout(tokenResponse.AccessToken)
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

	tokenResponse, err := client.GetAccessToken(context.Background())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get access token: %v\n", err)
		os.Exit(1)
	}

	mustWriteStdout(tokenResponse.AccessToken)
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

	clients, err := setup.client.GetAllClients(context.Background())
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get clients: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Clients fetched: %d\n", len(clients))
		fmt.Fprintf(os.Stderr, "---\n")
	}

	mustWriteStdout(string(mustMarshalJSON(clients, pretty, "clients")))
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

	mustParseFlags(fs)
	requireFlag(fs, scopes, "scopes")
	requireFlag(fs, appId, "app-id")

	setup, envFile := loadSetup(env, true)

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

	notAfter := time.Now().Add(defaultCertLifetime)
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

	req := createClientRequest(setup, appId, scopes)

	publicJwks, err := jwks.ToPublic()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get public JWKS: %v\n", err)
		os.Exit(1)
	}
	resp, err := setup.client.CreateClient(context.Background(), req, publicJwks)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create Maskinporten client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Client created: %s\n", resp.ClientId)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Output the client response
	jwk := jwks.Keys[0]
	mustWriteStdout(string(mustMarshalJSON(resp, pretty, "response")))
	mustWriteStdout("---")
	mustWriteStdout(string(mustMarshalJSON(jwk, pretty, "JWK")))
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
	mustParseFlags(fs)

	notAfter := parseNotAfter(notAfterStr)

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
	jwk := jwks.Keys[0]
	publicJwk := jwk.Public()
	mustWriteStdout(string(mustMarshalJSON(jwk, pretty, "JWK")))
	mustWriteStdout("---")
	mustWriteStdout(string(mustMarshalJSON(publicJwk, pretty, "public JWK")))
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

	if err := setup.client.DeleteClient(context.Background(), clientID); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to delete client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Client deleted: %s\n", clientID)
	}

	mustWriteStdout(clientID)
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

	mustParseFlags(fs)
	requireFlag(fs, clientID, "client-id")
	requireFlag(fs, scopes, "scopes")

	setup, envFile := loadSetup(env, false)

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", setup.config.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Updating client ID: %s\n", clientID)
		fmt.Fprintf(os.Stderr, "Scopes: %s\n", scopes)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// First, fetch the existing client to get all current fields
	existingClient, _, err := setup.client.GetClient(context.Background(), clientID)
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
	req.Scopes = splitCSV(scopes)

	resp, err := setup.client.UpdateClient(context.Background(), clientID, req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to update client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Client updated: %s\n", resp.ClientId)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	mustWriteStdout(string(mustMarshalJSON(resp, pretty, "response")))
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

	mustParseFlags(fs)
	requireFlag(fs, env, "env")
	requireFlag(fs, clientID, "client-id")
	requireFlag(fs, jwkStr, "jwk")

	validatePrivateJWK(jwkStr)

	ctx := context.Background()
	vaultURL := config.KeyVaultURL(env)

	if verbose {
		fmt.Fprintf(os.Stderr, "Key Vault URL: %s\n", vaultURL)
		fmt.Fprintf(os.Stderr, "Client ID: %s\n", clientID)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	client := mustKeyVaultClient(vaultURL)

	// Check for existing secrets if not forcing
	if !force {
		ensureSecretAbsent(ctx, client, maskinportenClientID)
		ensureSecretAbsent(ctx, client, maskinportenJWK)
	}

	// Set secrets
	if err := setSecret(ctx, client, maskinportenClientID, clientID); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to set %s: %v\n", maskinportenClientID, err)
		os.Exit(1)
	}
	if verbose {
		fmt.Fprintf(os.Stderr, "Set secret: %s\n", maskinportenClientID)
	}

	if err := setSecret(ctx, client, maskinportenJWK, jwkStr); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to set %s: %v\n", maskinportenJWK, err)
		os.Exit(1)
	}
	if verbose {
		fmt.Fprintf(os.Stderr, "Set secret: %s\n", maskinportenJWK)
	}

	_, err := fmt.Fprintf(os.Stdout, "Successfully initialized Key Vault secrets for environment %s\n", env)
	if err != nil {
		failf("Failed to write success message: %v\n", err)
	}
}

func secretExists(ctx context.Context, client *azsecrets.Client, name string) bool {
	_, err := client.GetSecret(ctx, name, "", nil)
	if err != nil {
		respErr := &azcore.ResponseError{}
		if errors.As(err, &respErr) {
			if respErr.StatusCode == http.StatusNotFound {
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
	if err != nil {
		return fmt.Errorf("set key vault secret %s: %w", name, err)
	}
	return nil
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
