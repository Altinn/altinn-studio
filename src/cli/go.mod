module altinn.studio/studioctl

go 1.27.3

// Go 1.27 makes SSL_CERT_FILE and SSL_CERT_DIR replace the platform certificate verifier on Windows
// and macOS. Developers on managed machines often set them for other tools, and a partial bundle
// would break studioctl's TLS, so keep verifying with the platform as before.
godebug x509sslcertoverrideplatform=0

require (
	altinn.studio/devenv v0.0.0
	github.com/mattn/go-runewidth v0.0.27
	github.com/tailscale/hujson v0.0.0-20260727124030-b80ff77dac4f
	golang.org/x/sys v0.47.0
	golang.org/x/term v0.45.0
	gopkg.in/yaml.v3 v3.0.1
)

require (
	github.com/Microsoft/go-winio v0.6.2 // indirect
	github.com/clipperhouse/uax29/v2 v2.2.0 // indirect
	github.com/kr/pretty v0.3.1 // indirect
	golang.org/x/sync v0.22.0 // indirect
	gopkg.in/check.v1 v1.0.0-20201130134442-10cb98267c6c // indirect
)

replace altinn.studio/devenv => ../Runtime/devenv
