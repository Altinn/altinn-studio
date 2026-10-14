# Maintaining the operator

## Maskinporten API models

The Go models for Maskinporten's self-service API are written from its OpenAPI specification. When the API
changes, download the [specification](https://api.samarbeid.digdir.dev/v3/api-docs/altinn-admin) to
[`schemas/spec.json`](../schemas/spec.json), and update the models, the client in
[`internal/maskinporten`](../internal/maskinporten) and the fakes in [`internal/fakes`](../internal/fakes) to match.
The [Swagger UI](https://api.samarbeid.digdir.dev/swagger-ui/index.html) and the
[API documentation](https://docs.digdir.no/docs/idporten/oidc/oidc_api_admin.html) describe the API.

## Upgrading Kubebuilder

When Kubebuilder releases a new major version, compare the project with a fresh scaffold:

1. Upgrade the Kubebuilder CLI.
2. Scaffold a new project in an empty directory, with a CRD that we use:

    ```sh
    kubebuilder init --domain altinn.studio --repo altinn.studio/operator --project-name operator
    kubebuilder create api --group resources --version v1alpha1 --kind MaskinportenClient
    make manifests
    ```

3. Compare the new project with this one, and search for hard-coded versions.
4. Run the builds, tests and linters.

## The operator's own Maskinporten client

The operator calls the self-service API with its own Maskinporten client, whose ID and JWK are in the environment's
Azure Key Vault. The operator rereads them periodically, so it needs no restart after they change. To renew the
JWK, or set up the client in a new environment:

1. Create the client in Maskinporten's self-service UI, if it does not exist.
2. Create a JWK. The command prints the private JWK, then the public JWK. Without `-not-after`, the certificate
   expires after a year.

    ```sh
    go run cmd/utils/main.go create jwk -cert-org Digdir -cert-cn altinn_studio_operator_supplier_client
    ```

3. Add the public JWK to the client in the self-service UI.
4. Write the client ID and the private JWK to the Key Vault with `go run cmd/utils/main.go init env`. It sets no
   expiry on the secrets, so set one in Key Vault that matches the certificate's.

To try the client against the API, sign in with `az` to an account that can read the environment's Key Vault, and
write an `<env>.env` file with the settings from `config/<env>/operator-config-patch.yaml`, in the format of
[`localtest.env`](../localtest.env). `go run cmd/utils/main.go` lists the commands.
