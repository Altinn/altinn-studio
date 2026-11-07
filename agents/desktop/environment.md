## This computer

- Containers run on Podman, behind the `docker` command and Docker Compose. kind, kubectl, Helm and Flux are installed,
  and the LocalTest hostnames are set at boot.
- A Buildah bug drops default environment variables in build stages. A `RUN` that downloads through Node or uv must
  export `NODE_EXTRA_CA_CERTS` or `SSL_CERT_FILE` with `/run/agent/tls/ca-bundle.pem`. Never persist them with `ENV`.
- Podman ignores a Dockerfile's own `<Dockerfile>.dockerignore` when the build context has a `.dockerignore`. Pass it
  with `--ignorefile`. Compose has no such option.
- Podman names an unqualified image `localhost/<name>`, so an image loaded with `kind load` matches a manifest only when
  both use the fully qualified name.
- The `kind` Podman network is IPv4-only, because on a dual-stack network .NET clients calling `localhost` time out.
  Keep it rather than delete it. devenv registers the mediated CA in the kind nodes through `STUDIO_CA_BUNDLE`.
- LocalTest reaches the App frontend's dev server through the host's network address, not its loopback. For
  `studioctl run --dev-frontend`, start it with `yarn start --host 0.0.0.0`, or `app-frontend.local.altinn.cloud`
  answers 502.
- Chromium trusts the mediated CA once `$XDG_RUNTIME_DIR/chromium-ca-ready` exists, seconds after boot. After an early
  certificate error, wait for that file and reopen the browser.
- App frontend's Cypress tests find Chromium only by path, so pass `--browser "$CHROME_PATH"`. Run `yarn cypress install`
  once per Cypress version, since Yarn skips its postinstall.
- `hurl` is Ubuntu's 7.1, where CI uses 8.0.
