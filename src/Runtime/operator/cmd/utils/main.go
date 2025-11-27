package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"altinn.studio/operator/internal/config"
	"altinn.studio/operator/internal/crypto"
	"altinn.studio/operator/internal/maskinporten"
	"altinn.studio/operator/internal/operatorcontext"
	"github.com/jonboulle/clockwork"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: %s <command> [options]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Commands:\n")
		fmt.Fprintf(os.Stderr, "  get     Get commands\n")
		fmt.Fprintf(os.Stderr, "  create  Create commands\n")
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "get":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: %s get <subcommand> [options]\n", os.Args[0])
			fmt.Fprintf(os.Stderr, "Subcommands:\n")
			fmt.Fprintf(os.Stderr, "  token    Get a Maskinporten access token\n")
			fmt.Fprintf(os.Stderr, "  clients  List Maskinporten clients\n")
			os.Exit(1)
		}

		subcommand := os.Args[2]
		switch subcommand {
		case "token":
			getToken()
		case "clients":
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
			os.Exit(1)
		}

		subcommand := os.Args[2]
		switch subcommand {
		case "jwk":
			createJwk()
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
		case "client":
			deleteClient()
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
	// Create a new flag set for the get token subcommand
	fs := flag.NewFlagSet("get token", flag.ExitOnError)
	var envFile string
	var verbose bool
	fs.StringVar(&envFile, "env", "dev.env", "Environment file to load configuration from")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")

	// Parse remaining args (skip program name, "get", "token")
	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	ctx := context.Background()
	environment := operatorcontext.ResolveEnvironment("")

	// Load configuration from env file
	config, err := config.GetConfig(ctx, environment, envFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config from %s: %v\n", envFile, err)
		os.Exit(1)
	}
	configValue := config.Get()

	// Create operator context
	operatorCtx, err := operatorcontext.Discover(ctx, environment, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to discover operator context: %v\n", err)
		os.Exit(1)
	}

	// Print configuration information if verbose
	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Authority URL: %s\n", configValue.MaskinportenApi.AuthorityUrl)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", configValue.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Client ID: %s\n", configValue.MaskinportenApi.ClientId)
		fmt.Fprintf(os.Stderr, "Scope: %s\n", configValue.MaskinportenApi.Scope)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Create HTTP API client
	clock := clockwork.NewRealClock()
	client, err := maskinporten.NewHttpApiClient(config, operatorCtx, clock)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to create Maskinporten client: %v\n", err)
		os.Exit(1)
	}

	// Get the access token
	tokenResponse, err := client.GetAccessToken(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to get access token: %v\n", err)
		os.Exit(1)
	}

	// Output just the token to stdout
	fmt.Println(tokenResponse.AccessToken)
}

func getClients() {
	fs := flag.NewFlagSet("get clients", flag.ExitOnError)
	var envFile string
	var verbose bool
	var pretty bool
	fs.StringVar(&envFile, "env", "dev.env", "Environment file to load configuration from")
	fs.BoolVar(&verbose, "verbose", false, "Print configuration information to stderr")
	fs.BoolVar(&pretty, "pretty", false, "Format JSON output with indentation")

	err := fs.Parse(os.Args[3:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to parse flags: %v\n", err)
		os.Exit(1)
	}

	ctx, cfg, client, err := setupMaskinportenClient(envFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", cfg.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	clients, err := client.GetAllClients(ctx)
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

func deleteClient() {
	fs := flag.NewFlagSet("delete client", flag.ExitOnError)
	var envFile string
	var clientID string
	var verbose bool
	fs.StringVar(&envFile, "env", "dev.env", "Environment file to load configuration from")
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

	ctx, cfg, client, err := setupMaskinportenClient(envFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Configuration loaded from: %s\n", envFile)
		fmt.Fprintf(os.Stderr, "Self Service URL: %s\n", cfg.MaskinportenApi.SelfServiceUrl)
		fmt.Fprintf(os.Stderr, "Deleting client ID: %s\n", clientID)
		fmt.Fprintf(os.Stderr, "---\n")
	}

	if err := client.DeleteClient(ctx, clientID); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to delete client: %v\n", err)
		os.Exit(1)
	}

	if verbose {
		fmt.Fprintf(os.Stderr, "Client deleted: %s\n", clientID)
	}

	fmt.Println(clientID)
}

func setupMaskinportenClient(envFile string) (context.Context, *config.Config, *maskinporten.HttpApiClient, error) {
	ctx := context.Background()
	environment := operatorcontext.ResolveEnvironment("")

	config, err := config.GetConfig(ctx, environment, envFile)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to load config from %s: %w", envFile, err)
	}

	operatorCtx, err := operatorcontext.Discover(ctx, environment, nil)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to discover operator context: %w", err)
	}

	clock := clockwork.NewRealClock()
	client, err := maskinporten.NewHttpApiClient(config, operatorCtx, clock)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("failed to create Maskinporten client: %w", err)
	}

	return ctx, config.Get(), client, nil
}

func createJwk() {
	// Create a new flag set for the create jwk subcommand
	fs := flag.NewFlagSet("create jwk", flag.ExitOnError)
	var certCommonName string
	var notAfterStr string
	var verbose bool
	var pretty bool
	fs.StringVar(&certCommonName, "cert-common-name", "default-cert", "Common name for the certificate")
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

	ctx := context.Background()
	environment := operatorcontext.ResolveEnvironment("")

	// Create operator context
	operatorCtx, err := operatorcontext.Discover(ctx, environment, nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to discover operator context: %v\n", err)
		os.Exit(1)
	}

	// Print crypto constants if verbose
	if verbose {
		fmt.Fprintf(os.Stderr, "Crypto configuration:\n")
		fmt.Fprintf(os.Stderr, "Signature Algorithm: %s\n", crypto.DefaultSignatureAlgorithmName())
		fmt.Fprintf(os.Stderr, "X.509 Signature Algorithm: %v\n", crypto.DefaultX509SignatureAlgo)
		fmt.Fprintf(os.Stderr, "Key Size (bits): %d\n", crypto.DefaultKeySizeBits)
		fmt.Fprintf(os.Stderr, "Certificate Common Name: %s\n", certCommonName)
		fmt.Fprintf(os.Stderr, "Certificate Not After: %s\n", notAfter.Format(time.RFC3339))
		fmt.Fprintf(os.Stderr, "---\n")
	}

	// Create crypto service
	clock := clockwork.NewRealClock()
	cryptoService := crypto.NewDefaultService(operatorCtx, clock, rand.Reader)

	// Create JWKS
	jwks, err := cryptoService.CreateJwks(certCommonName, notAfter)
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
