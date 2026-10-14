# Maintaining the operator

## Updating the Maskinporten API models

The Go models for Maskinporten's self-service API are written by hand. Follow these steps when the API changes.

1. Download the [specification](https://api.samarbeid.digdir.dev/v3/api-docs/altinn-admin) to
   [`schemas/spec.json`](../schemas/spec.json).
2. Update the models and the client in [`internal/maskinporten`](../internal/maskinporten).
3. Update the fakes in [`internal/fakes`](../internal/fakes).

The [Swagger UI](https://api.samarbeid.digdir.dev/swagger-ui/index.html) and the
[API documentation](https://docs.digdir.no/docs/idporten/oidc/oidc_api_admin.html) describe the API.

## Upgrading Kubebuilder

Follow these steps when Kubebuilder releases a new major version.

1. Upgrade the Kubebuilder CLI.
2. Scaffold a new project with one of our CRDs in an empty directory.

    ```sh
    kubebuilder init --domain altinn.studio --repo altinn.studio/operator --project-name operator
    kubebuilder create api --group resources --version v1alpha1 --kind MaskinportenClient
    make manifests
    ```

3. Compare the new project with this one, and look for hard-coded versions.
4. Run the builds, tests and linters.

## The operator's own Maskinporten client

- The client is named `altinn_apps_supplier_client` in Maskinporten's self-service UI.
- Its ID and JWK are stored in the environment's Azure Key Vault. The operator rereads them, so it does not need a
  restart when they change.

Follow these steps to renew the JWK or to set up the client in a new environment.

1. If the environment is new, create the client in the self-service UI.
2. Create a JWK. The command prints the private JWK first and then the public JWK. The certificate expires after a
   year unless you set `-not-after`.

    ```sh
    go run cmd/utils/main.go create jwk -cert-org Digdir -cert-cn altinn_studio_operator_supplier_client
    ```

3. Add the public JWK to the client in the self-service UI.
4. Write the client ID and the private JWK to Key Vault with `go run cmd/utils/main.go init env`. Add `-force` to
   overwrite existing secrets.
5. In Key Vault, set the secrets' expiry date to the certificate's expiry date.

Follow these steps to test the client against the API.

1. Sign in with `az` to an account that can read the environment's Key Vault.
2. Write an `<env>.env` file with the settings from `config/<env>/operator-config-patch.yaml`. Use the format of
   [`localtest.env`](../localtest.env).
3. Run `go run cmd/utils/main.go` to list the available commands.
