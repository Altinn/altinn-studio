---
name: studio-integrations
description: "How an Altinn app talks to other systems: Maskinporten, external APIs over HttpClient, Correspondence, email and SMS notifications, Altinn Events, eFormidling, Fiks Arkiv, and system users and API scopes for callers."
metadata:
  studio-title: Integrasjoner
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/guides/integration/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/integration/
---

The `studio-app-lib` skill says where custom code goes, the `studio-process` skill covers the service tasks for
eFormidling and Fiks Arkiv, and the `studio-policy` skill writes the rights.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.
Maskinporten differs the most.

## Maskinporten

The app uses Maskinporten when it calls another system as the service owner rather than as the logged-in user. A
token carries scopes, and Maskinporten grants a scope only to a client that is registered with it.

- Every app has a built-in `IMaskinportenClient`. Do not register it.
- Attach it to an `HttpClient` in `RegisterCustomAppServices` in `Program.cs`. The client then puts a token on every
  request:

  ```csharp
  services.AddHttpClient<MyApiClient>().UseMaskinportenAuthorization("scope:a", "scope:b");
  services.AddHttpClient<MyAltinnClient>().UseMaskinportenAltinnAuthorization("altinn:some.scope");
  ```

  Use `UseMaskinportenAuthorization` for APIs that take a Maskinporten token, and
  `UseMaskinportenAltinnAuthorization` for Altinn APIs, which need the token exchanged for an Altinn token.
- To get a token in other code, inject `IMaskinportenClient` and call `GetAccessToken(scopes)` or
  `GetAltinnExchangedToken(scopes)`.
- Every scope the code requests must be on the client the app uses. When Studio provides the client, add the scope
  in Studio, on the Maskinporten tab of the app settings. Your organization must have access to the scope from its
  owner, and the user who adds it must be allowed to manage Maskinporten clients for the organization. Scopes take
  effect when the app is next built and deployed.
- Calls to the app's own instances as the service owner also need the policy to grant `[org]` `read` and `write`.
- Never put a client's key or ID in the repository. The version files say where the client comes from and how a
  local run gets one.

## External APIs

- Put the calls in a typed client class, register it with `services.AddHttpClient<MyApiClient>()` and inject it where
  the data is needed: prefill, data processing, a code list, validation or a process hook. The `studio-app-lib` skill
  says which interface fits.
- Keep the base URL and other plain settings in a section of the app's own in `appsettings.json`, with overrides in
  `appsettings.Staging.json` and `appsettings.Production.json`. Keep API keys in Key Vault, as the
  `studio-app-settings` skill says.
- Authenticate with Maskinporten as above, or with a key you read through `ISecretsClient` or from configuration.
- For code lists from public registers, such as SSB and Kartverket, the `Altinn.Codelists` package already calls the
  API. The `studio-code-lists` skill covers it.
- To show data from another system in the form without storing it, implement `IExternalApiClient`. Its `Id` is the
  name the expression `["externalApi", "<id>", "<path>"]` uses, with the same case. The frontend fetches the data
  from `.../api/external/<id>`, and the app calls every registered client each time. Use `externalApi` only for text
  that the user sees. The backend cannot evaluate it, so do not use it in `hidden`, `required`, validation or the
  process.

## Correspondence

The app sends messages to the Altinn inbox through the built-in `ICorrespondenceClient`. Do not register it.

- Build the message with `CorrespondenceRequestBuilder.Create()`: `WithResourceId`, `WithSendersReference`,
  `WithRecipient`, `WithContent`, then optional notification and attachments, then `Build()`.
- Send it with `Send(new SendCorrespondencePayload(request, CorrespondenceAuthenticationMethod.Default()))`.
  `Default()` gets a token from the app's Maskinporten client, so the client needs `altinn:correspondence.write`.
- Every message belongs to a resource in the resource registry, not to the app. The resource's policy must let the
  recipients `read`. Use the role code `priv` for people.
- Correspondence lets the sender past the resource's policy only when the token has the scope `altinn:serviceowner`
  and the sending organization owns the resource. In every other case the policy must grant your organization
  `write`. Granting `write` is always safe. The version files say whether `Default()` asks for
  `altinn:serviceowner`.
- Send from code that runs once per instance, such as a process hook, and send last, after everything that can
  fail. The version files say how to keep a retry from sending twice.

## Notifications

- `IEmailNotificationClient.Order` and `ISmsNotificationClient.Order` order an email or SMS from Altinn
  Notifications. `INotificationOrderClient.Order` uses the newer order API. All three are built in. The app
  authenticates with its own platform token, so they need no Maskinporten scope and no settings.
- Order the notification after everything else in the code has succeeded. A hook that fails and runs again sends it
  again.
- A system that creates an instance through the API can ask the app to notify the instance owner, with the
  `notification` field of the instantiation request.
- A correspondence carries its own notification. Use `WithNotification` on the request instead.

## Altinn Events

- With `"RegisterEventsWithEventsComponent": true` under `AppSettings`, the app publishes `app.instance.created`,
  `app.instance.process.movedTo.<taskId>`, `app.instance.process.completed` and `app.instance.substatus.changed`. The
  template sets it to `false`.
- `IEventsClient.AddEvent(eventType, instance)`, from `Altinn.App.Core.Internal.Events`, publishes an event of your
  own. It works whatever the setting is.
- An event says which instance it is about, not the data. The subscriber fetches the data and must handle the same
  event twice and events out of order.
- A subscriber sets up its subscription in Altinn Events, not in the app. Receiving events in the app differs between
  the versions.

## eFormidling and Fiks Arkiv

Both send the instance's data to the recipient's archive or case system from a service task in the process. The
`studio-process` skill places the task. [references/eformidling-and-fiks-arkiv.md](references/eformidling-and-fiks-arkiv.md)
covers the registration, settings, receivers and secrets they need.

## Systems that call the app

Other systems call the app's API with an Altinn token. Three kinds of caller are common:

- An end-user system on behalf of a logged-in person, through ID-porten, with `altinn:instances.read` and
  `altinn:instances.write`.
- An end-user system as a system user. The vendor registers the system in Altinn's system register with rights to the
  resource `app_<org>_<app>`, and the customer approves a system user. The vendor gets a Maskinporten token for the
  system user and exchanges it for an Altinn token. The app needs no configuration for this.
- The service owner's own systems, through Maskinporten with `altinn:serviceowner/instances.read` and
  `altinn:serviceowner/instances.write`.

The policy decides what each caller may do. A system user gets the rights the system asks for, and the person who
approves it must hold those rights through roles or access packages. The `studio-policy` skill writes the rules.

- To branch on the caller in code, inject `IAuthenticationContext` and test `Current`: `Authenticated.User`,
  `Authenticated.SystemUser`, `Authenticated.Org` or `Authenticated.ServiceOwner`.
- `apiScopes` in `applicationmetadata.json` makes the instance APIs require app-specific scopes. `users` applies to
  users, system users and organizations, and `serviceOwners` to the service owner. Each has `read`, for `GET`, and
  `write`, for every other method. `[app]` in a scope becomes the app's name. Without `apiScopes`, the app checks no
  scopes. A token without the scope gets `403`, so adding `apiScopes` locks out every client that lacks it. Agree on
  the scopes with the systems that call the app first.

## Before you finish

- Every scope the code requests is on the Maskinporten client the app uses, both deployed and locally.
- No key, password, client ID or token is in the repository.
- Every client class is registered in `Program.cs`.
- The resource, policy and Maskinporten scopes for Correspondence are in place before the first send.
- The app builds, for example with `dotnet build App/App.csproj`.
