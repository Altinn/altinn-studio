# eFormidling and Fiks Arkiv

Both send the instance's data from a service task: `eFormidling` through the eFormidling integration point, and
`fiksArkiv` through Fiks IO to a municipal archive. The `studio-process` skill places the task in the process. This
file covers what the app needs around it. The version files say how to register each one, and what differs.

## eFormidling

- The app calls Altinn as the service owner through its Maskinporten client, with the scopes
  `altinn:serviceowner/instances.read` and `altinn:serviceowner/instances.write`. The version files say whether you
  add them in Studio.
- The task's `<altinn:eFormidlingConfig>` in `process.bpmn` describes the shipment:
  - `receiver`: the organization number of the recipient. Only Norwegian organizations can receive.
  - The other elements name the message type, which you ask the recipient for, and the data types to send, which
    must exist in `applicationmetadata.json`. The eFormidling pages under Docs describe each element.
  - `disabled`: `true` stops the task from sending. The task still completes.
  - Every element takes an `env` attribute, so it can have one value in TT02 and another in production. A value with
    `env` wins over one without.
- The app must have a class that implements `IEFormidlingMetadata`. `GenerateEFormidlingMetadata` returns the file
  name and content of the message metadata, normally `arkivmelding.xml`. There is no default.
- To choose the recipient in code, implement `IEFormidlingReceivers`. `GetEFormidlingReceivers` gets the `receiver`
  from the configuration as `receiverFromConfig`. Prefix a Norwegian organization number with `0192:` in the
  `Identifier` of each `Receiver` you return. Without your class, the app sends to the configured `receiver`.
- `EFormidlingClientSettings:BaseUrl` is the integration point. The platform sets it in TT02 and production.
- `AppSettings:EFormidlingSender` is the sender's organization number. Change it only in
  `appsettings.Development.json`. The integration fails in TT02 and production with another value.
- In TT02, follow a shipment at `https://platform.tt02.altinn.no/eformidling/api/conversations?messageId=<instanceGuid>`.

## Fiks Arkiv

- Add the NuGet package `Altinn.App.Clients.Fiks` in the same version as `Altinn.App.Api`, and call
  `services.AddFiksArkiv()` from `Altinn.App.Clients.Fiks.Extensions` in `RegisterCustomAppServices`.
- Add the scope `ks:fiks` to the app in Studio. Fiks IO authenticates with the app's Maskinporten client.
- Give each app its own Fiks Arkiv account in Fiks Forvaltning. The archive answers the account that sent the
  message, so an app that shares an account can pick up another app's answers.
- `FiksIOSettings` holds `AccountId`, `IntegrationId`, `IntegrationPassword` and `AccountPrivateKeyBase64`. Put the
  password and the private key in Key Vault as `FiksIOSettings--IntegrationPassword` and
  `FiksIOSettings--AccountPrivateKeyBase64`. The app needs Key Vault as a configuration provider, as the
  `studio-app-settings` skill says. Leave `ApiHost` and `AmqpHost` out. The app picks KS's test environment
  everywhere except production.
- `FiksArkivSettings` says which archive gets what, which data types store the archive record and the receipt, and
  what the process does after the task. Those data types must exist in `applicationmetadata.json`. The Fiks Arkiv
  pages under Docs list the keys, and the class in `Altinn.App.Clients.Fiks` has them all.

## Docs

- [eFormidling (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/eformidling/service-task/) and
  [eFormidling (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/receive-data/eformidling/): the task
  configuration, the metadata and receiver classes, and testing.
- [Fiks Arkiv (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/fiks-arkiv/) and
  [Fiks Arkiv (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/receive-data/fiks-arkiv/): the account, every key
  of `FiksArkivSettings`, the process around the task, and replacing the archive record with an
  `IFiksArkivPayloadGenerator`. The v9 page's message handler takes a `ServiceTaskContext`, which v9 no longer has.
