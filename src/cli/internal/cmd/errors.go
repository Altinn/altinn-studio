package cmd

import "errors"

// Sentinel errors for the cmd package.
var (
	// ErrUnknownSubcommand is returned when an unknown subcommand is provided.
	ErrUnknownSubcommand = errors.New("unknown subcommand")

	// ErrNoAppFound is returned when no Altinn app is detected.
	ErrNoAppFound = errors.New("no Altinn app found")

	// ErrUnsupportedRuntime is returned when an unsupported runtime is specified.
	ErrUnsupportedRuntime = errors.New("unsupported runtime")

	// ErrDotnetVersionTooOld is returned when the .NET SDK version is too old.
	ErrDotnetVersionTooOld = errors.New("dotnet version too old")

	// ErrGitVersionTooOld is returned when the Git version is too old.
	ErrGitVersionTooOld = errors.New("git version too old")

	// ErrNoContainerRuntime is returned when no container runtime is found.
	ErrNoContainerRuntime = errors.New("no container runtime found")

	// ErrWindowsVersionTooOld is returned when Windows version lacks AF_UNIX support.
	ErrWindowsVersionTooOld = errors.New("windows version too old")

	// ErrWindowsVersionUnknown is returned when Windows version cannot be detected.
	ErrWindowsVersionUnknown = errors.New("windows version unknown")

	// ErrMissingArgument is returned when a required argument is missing.
	ErrMissingArgument = errors.New("missing required argument")

	// ErrNotLoggedIn is returned when authentication is required but not present.
	ErrNotLoggedIn = errors.New("not logged in")

	// ErrUnknownEnvironment is returned when an unknown environment is specified.
	ErrUnknownEnvironment = errors.New("unknown environment")

	// ErrTokenRequired is returned when a token is required but not provided.
	ErrTokenRequired = errors.New("token is required")

	// ErrInvalidToken is returned when token validation fails.
	ErrInvalidToken = errors.New("invalid token")

	// ErrInvalidRepoFormat is returned when repository format is invalid.
	ErrInvalidRepoFormat = errors.New("invalid repository format")

	// ErrInvalidFlagValue is returned when a flag value is invalid.
	ErrInvalidFlagValue = errors.New("invalid flag value")
)
