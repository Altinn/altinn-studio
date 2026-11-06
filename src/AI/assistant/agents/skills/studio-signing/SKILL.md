---
name: studio-signing
description: "Set up signing in an Altinn app end to end: choose the kind of signing, then make signatureConfig, the signature data types, the sign action and policy, ISigneeProvider, delegation, Correspondence and the signing components agree."
metadata:
  studio-title: Signering
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/signing/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/process/signing/
---

Use this skill to set up signing in an app, from choosing the kind of signing to a signing task that works. Signing
spans the process, the data types, the policy, C# code, the pages and Correspondence, and they must agree. The
`studio-process` skill covers the process file in general.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## Choose the kind of signing

Every kind uses a task with `taskType` `signing`. The kinds differ in who signs and how they get the right to sign.

| Kind | Who signs | Choose it when |
| --- | --- | --- |
| The user signs | The user who filled in the form, in a signing task after the data task | The person who fills in the form must confirm it, often on a PDF of it. |
| Role or access package | Every user the policy grants `sign` for the instance owner, such as the general manager or an accountant | You know the signer's role or access package, not the person. |
| User-controlled | The persons and organizations the form data names. The app delegates the right to sign when the task starts. | The form data decides who signs, such as the founders of a company. |
| Sign and submit | The user who fills in the form. The data task itself is a signing task. | The user signs their own data with the submit click, and no one else signs. |
| API signing | Any of the above, through the app's API instead of its pages | A system signs, or the signer uses another user interface. |

- Both versions support all five kinds.
- "The user signs" and "role or access package" have the same task configuration. Only the policy differs.
- A process can have several signing tasks, each of its own kind. To stop one person from signing in two of them,
  list the earlier task's signature data type in `uniqueFromSignaturesInDataTypes`.
- Only users and system users can sign. The service owner cannot.
- Sign and submit cannot sign `ref-data-as-pdf`, because the PDF does not exist yet. Use a data task and a separate
  signing task when the signature must cover the PDF.

## The signing task

```xml
<bpmn:task id="SigningTask" name="Signering">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>signing</altinn:taskType>
      <altinn:actions>
        <altinn:action>sign</altinn:action>
        <altinn:action>reject</altinn:action>
      </altinn:actions>
      <altinn:signatureConfig>
        <altinn:dataTypesToSign>
          <altinn:dataType>ref-data-as-pdf</altinn:dataType>
        </altinn:dataTypesToSign>
        <altinn:signatureDataType>signatures</altinn:signatureDataType>
        <altinn:runDefaultValidator>true</altinn:runDefaultValidator>
        <altinn:signeeProviderId>founders</altinn:signeeProviderId>
        <altinn:signeeStatesDataTypeId>signeeStates</altinn:signeeStatesDataTypeId>
        <altinn:correspondenceResource>ttd-signing-messages</altinn:correspondenceResource>
        <altinn:signingPdfDataType>signingPdf</altinn:signingPdfDataType>
      </altinn:signatureConfig>
    </altinn:taskExtension>
  </bpmn:extensionElements>
  ...
</bpmn:task>
```

- `dataTypesToSign` names the data the signature covers: form data, attachments or `ref-data-as-pdf`. That data must
  exist when the user signs. For `ref-data-as-pdf`, put a PDF service task before the signing task. When no data of
  the listed types exists, the sign action fails. If every listed type has `minCount` 0, the app does not check that
  the signature covers anything.
- `signatureDataType` is required. The app stores the signatures there.
- `signeeProviderId` and `signeeStatesDataTypeId` turn on user-controlled signing. Set both or neither, and leave
  both out for the other kinds.
- `correspondenceResource` lets the app notify the signees in user-controlled signing, which needs it. In every kind,
  it also turns on a receipt to each signer. Leave it out when you want neither.
- `signingPdfDataType` is optional. It makes the app store a PDF of the signing task's pages when the task ends.
- Set `runDefaultValidator` to `true`. The process can then leave the task only when every signee has signed and the
  signature data type's `minCount` is met. Without it, SigningActions offers the submit button before everyone has
  signed.
- When the process leaves a signing task, the app checks that the signed data has not changed since it was signed.

## Data types

Add each data type to `dataTypes` in `App/config/applicationmetadata.json`, with the ID written exactly as in the
task:

```json
{
  "id": "signatures",
  "allowedContentTypes": ["application/json"],
  "allowedContributors": ["app:owned"],
  "taskId": "SigningTask",
  "minCount": 1,
  "maxCount": 0
}
```

- The signature and signee-states data types have `allowedContributors` exactly `["app:owned"]`, so that no one can
  change them through the app's API. Both hold `application/json`.
- Set the signature data type's `taskId` to the signing task. Storage rejects every signature when it names another
  task, and the app checks `maxCount` only for data types whose `taskId` is the task.
- The app stores each signature as a data element of its own. Set `minCount` to the number of signatures the task
  needs, and `maxCount` to at least the number of signers, or 0 for no limit. The app checks both counts when the
  process leaves the task.
- The signing PDF data type allows `application/pdf` and has no `appLogic`.
- Signatures contain the signer's national identity number, and everyone who can read the instance can read them. To
  restrict them, set `actionRequiredToRead` and `actionRequiredToWrite` to `signature-access` on the signature and
  signee-states data types, and grant the service owner `signature-access` in the policy. The app then reads and writes
  them as the service owner, through Maskinporten.
- When you add a signing task in Studio's process editor, Studio creates the data types with `taskId`,
  `["app:owned"]` and `maxCount` 1. Raise `maxCount` when more than one person signs. Studio leaves
  `dataTypesToSign` empty, and also `signeeProviderId` for user-controlled signing. Fill them in.

## Actions and policy

The `studio-policy` skill covers how to write rules. Scope these rules to the signing task with `urn:altinn:task`.

- List `sign` in the task's `altinn:actions`, and `reject` when signers may decline. The frontend offers only the
  actions the task lists. Route a reject with a gateway after the task, as the `studio-process` skill describes.
- Grant `read` and `sign` to the signers. A user with `sign` who has not signed always gets the sign button, so grant
  `sign` to the person who fills in the form only when they should sign too.
- Grant `write` to the person who submits the task. The process does not move on by itself after the last signature,
  and SigningActions offers the submit button only to users with `write`.
- Grant `reject` to those who may decline.
- For user-controlled signing, add a rule that lets the app delegate:
  - subject: `urn:altinn:resource:delegation` with the value `app_<org>_<app>`
  - resources: the org, the app, and each signing task that has a `signeeProviderId`
  - actions: `read`, `sign`, and every action in a signee's `AdditionalActionsToDelegate`

  Without it, delegation fails, and SigningActions shows an error instead of the sign button.

## User-controlled signing

- Implement `ISigneeProvider` from `Altinn.App.Core.Features.Signing`. Its `Id` must equal `signeeProviderId`, and
  exactly one registered provider may have that `Id`. Register it in `Program.cs` with
  `services.AddTransient<ISigneeProvider, FounderSigneesProvider>();`. The `studio-app-lib` skill covers C#
  extension points.
- `GetSignees` returns `ProvidedPerson` items, with national identity number and full name, and
  `ProvidedOrganization` items, with organization number and name. Users with a key role in an organization can sign
  for it.
- The app calls the provider when the task starts and passes the form data through
  `parameters.InstanceDataAccessor`. Validate the signee fields in the data task, so they are complete by then.
- The app delegates `read` and `sign` on the signing task to each signee, notifies them, and revokes the rights when
  the task ends. Set `AdditionalActionsToDelegate` on a signee to delegate more, such as `reject`.
- When delegation or the notification fails for a signee, the app records it in the signee states, and SigneeList
  shows it.
- `CommunicationConfig` on a signee overrides the texts, the notification channel, and the email address or phone
  number. The user-controlled signing guide lists its properties and the default texts. A custom inbox body must keep
  the `$instanceUrl$` placeholder, or the signee gets no link to the form.

## Notifications through Correspondence

- In user-controlled signing, the app sends each signee a Correspondence message when the task starts. With a
  `correspondenceResource`, every kind of signing sends each signer a receipt after they sign.
- `correspondenceResource` is the ID of a Correspondence resource that the service owner creates in Altinn's resource
  registry. The `studio-integrations` skill says what the resource's policy must grant. Several
  `correspondenceResource` elements with `env` attributes give each environment its own resource.
- The app sends as the service owner through Maskinporten, which needs the Correspondence scopes. The
  `studio-integrations` skill covers Maskinporten and Correspondence.
- When a receipt fails, the app only logs it, and the signature stands.
- The text keys `signing.correspondence_receipt_title`, `signing.correspondence_receipt_summary` and
  `signing.correspondence_receipt_body` override the receipt texts for every signer.

## Pages

The signing task needs pages of its own. The version files say where they live, and the `studio-layouts` skill covers
pages and components.

- `SigningDocumentList` lists the data the user signs.
- `SigneeList` lists the signees and their status. Without user-controlled signing it lists only those who have
  signed.
- `SigningActions` shows the sign, reject and submit buttons that fit the user and the state of the task.
- Use these three only on a signing task's pages. The frontend reports a layout error anywhere else.
- Without SigningActions, add an `ActionButton` with `"action": "sign"`. It signs and moves the process on in one
  step. Sign and submit uses it on the form's last page.

## API signing

- `POST /{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/actions` with `{"action": "sign"}` signs and
  leaves the process in the task, so that several people can sign. A user, but not a system user, can add
  `"onBehalfOf"` with an organization number to sign for an organization signee.
- `PUT .../process/next` with `{"action": "sign"}` signs and moves the process on, so only one person signs in that
  task.
- `GET .../signing` lists the signees and their status.
- The task, the data types and the policy are the same as with the app's pages.

## Before you finish

- Every data type ID in `signatureConfig` exists in `applicationmetadata.json`, written the same way.
- The signature data type is app-owned, its `taskId` is the signing task, and its `minCount` and `maxCount` fit the
  number of signers.
- The data to sign exists when the task starts.
- The task lists `sign`, and `reject` if used. The policy grants them on the task ID, and someone who submits has
  `write`.
- User-controlled signing: one registered provider per `signeeProviderId`, the delegation rule, and a
  `correspondenceResource` for every environment the app runs in.
- Build and start the app, and sign once. Localtest has no Correspondence, so test notifications and receipts in a
  test environment.

## Docs

- [Signing guides for v8](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/signing/) and the
  [v9 signing overview](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/process/signing/): the kinds
  of signing, with a guide for each.
- User-controlled signing for
  [v8](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/signing/runtime-delegated-signing/) and
  [v9](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/process/signing/how-to/runtime-delegated-signing/):
  `CommunicationConfig`, the default texts, and the delegation rule in full.
- The signing task reference for
  [v8](https://docs.altinn.studio/nb/altinn-studio/v8/reference/process/tasks/signing/) and
  [v9](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/process/tasks/signing/): the
  signature object, unique signatures and how to verify a signature's hash.
- API signing for
  [v8](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/signing/api-signing/) and
  [v9](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/process/signing/how-to/api-signing/): the
  calls and their responses.
- [Getting started with Correspondence as a service owner](https://docs.altinn.studio/nb/correspondence/getting-started/developer-guides/serviceowner/):
  how to create the Correspondence resource and get the scopes.
