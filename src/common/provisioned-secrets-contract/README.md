# Provisioned secrets contract

The app's Maskinporten client reaches the app libraries as a file in the app's secrets directory. Three parties
share that file, in three languages:

- the operator writes it into the app's Secret
  ([`client_state.go`](../../Runtime/operator/internal/maskinporten/client_state.go)), and the platform's
  [app environment](../../../infra/runtime/apps-config/base/apps-runtime-common-env.yaml) tells a deployed app
  where the directory is and what the file is called
- studioctl writes it for a local run ([`appsecrets`](../../cli/internal/appsecrets/maskinporten.go)) and tells
  the app the same names
- the app libraries read it (`ProvisionedSecrets`, `ProvisionedSecretFiles.Maskinporten` and `MaskinportenSettings`
  in [`Altinn.App.Core`](../../App/backend/src/Altinn.App.Core/Internal/ProvisionedSecrets/ProvisionedSecrets.cs))

[`contract.json`](contract.json) names the variables, the file name and the object the file wraps its contents
in, and lists one example file per format a writer produces, with the client each one holds. The keys in the
examples are throwaway test keys.

Each party is tested against these files:

- The operator's [test](../../Runtime/operator/internal/maskinporten/provisioned_file_contract_test.go) checks
  that it writes its example, under the contract's file name, and that the platform's app environment names
  that file.
- studioctl's [test](../../cli/internal/appsecrets/provisioned_file_contract_test.go) checks that it writes its
  examples and sets the contract's variables and file name.
- The app libraries'
  [test](../../App/backend/test/Altinn.App.Core.Tests/Features/Maskinporten/ProvisionedFileContractTests.cs)
  checks that they read the contract's variables and that every example binds and signs a Maskinporten grant.

When a writer changes its format, its test fails until its example is updated, and the app libraries' test then
shows whether they still read it. A new format gets a new example in `contract.json`.
