---
name: studio-payment
description: "Set up payment in an Altinn app end to end: the payment task's paymentConfig and data types, pay, confirm and reject in the process and policy, IOrderDetailsCalculator, Nets Easy settings and secret key, and the Payment components."
---

A payment task takes the payment through Nets Easy, or through a payment processor you write. The process, the data
types, the policy, C# code, the settings and the pages must agree. The `studio-process` skill covers the process file
in general.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## How a payment runs

Each part of the setup serves one of these steps:

1. When an instance enters the payment task, the app cancels any unfinished payment from an earlier visit.
2. The frontend runs the `pay` action. The app gets the order from your `IOrderDetailsCalculator`, starts the payment
   with the payment processor the order names, stores the payment information, and sends the user to Nets' payment
   page. An order that totals 0 skips the payment processor.
3. Nets sends the user back. The `Payment` component shows the result, and its button runs `confirm`, which moves the
   process on. In a deployed app, Nets also tells the app when the payment completes, and the app then runs `confirm`
   itself as the service owner.
4. When the task ends, the app checks that the payment is paid and stores a PDF receipt.
5. The Back button runs `reject`. The app cancels the payment, and a gateway after the task sends the process back.

## The payment task and its data types

```xml
<bpmn:task id="Task_Payment" name="Betaling">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>payment</altinn:taskType>
      <altinn:actions>
        <altinn:action>pay</altinn:action>
        <altinn:action>confirm</altinn:action>
        <altinn:action>reject</altinn:action>
      </altinn:actions>
      <altinn:paymentConfig>
        <altinn:paymentDataType>paymentInformation</altinn:paymentDataType>
        <altinn:paymentReceiptPdfDataType>paymentReceiptPdf</altinn:paymentReceiptPdfDataType>
      </altinn:paymentConfig>
    </altinn:taskExtension>
  </bpmn:extensionElements>
  ...
</bpmn:task>
```

- Both data type IDs are required. Each must name a data type in `App/config/applicationmetadata.json`, written
  exactly as in the task.
- The payment data type holds the order and the payment status. Give it `"allowedContentTypes": ["application/json"]`,
  `"allowedContributors": ["app:owned"]` and `"maxCount": 1`.
- The receipt data type allows `application/pdf`, has no `appLogic`, and has `"maxCount": 1`.
- Give each payment task its own two data types. A task that shares the payment data type with an earlier payment
  task finds that payment paid and refuses to start a new one.
- When you add a payment task in Studio's process editor, Studio creates both data types, app-owned and bound to the
  task.

## Actions, gateway and policy

- List `pay`, `confirm` and `reject` in the task's `altinn:actions`, as Studio does. The `Payment` component uses all
  three. `reject` matters most: the app skips validation for a reject only when the task lists `reject`.
- Put an exclusive gateway after the task. Send the flow with `["gatewayAction"]` equal to `reject` back to the data
  task, and the flow with `confirm` onward. The `studio-process` skill covers gateway conditions, which differ between
  the versions.
- In the policy, scope these grants to the payment task with `urn:altinn:task`. The `studio-policy` skill covers how
  to write rules.
  - Grant the payer `read`, `write`, `pay`, `confirm` and `reject`. The app saves the payment information with the
    payer's rights, and Storage requires `write` for that.
  - Grant the service owner `confirm`, in addition to the `read` and `write` every app grants it. Without `confirm`,
    the app cannot move the process on when Nets reports the payment, and the instance waits for the user to come
    back.
- Studio's process editor adds a rule with `read`, `pay`, `confirm` and `reject`, but no `write` and no subject. Add
  `write`, and the roles or access packages that may pay. A rule without a subject does not limit who it applies to.

## Order details

- Implement `IOrderDetailsCalculator` from `Altinn.App.Core.Features.Payment`, and register it in `Program.cs` with
  `services.AddTransient<IOrderDetailsCalculator, OrderDetailsCalculator>();`. Without it, the payment fails to start.
  The method's signature differs between the versions. The `studio-app-lib` skill covers C# extension points.
  `OrderDetails`, `PaymentOrderLine` and `PaymentReceiver` are in `Altinn.App.Core.Features.Payment.Models`.
- `CalculateOrderDetails` returns an `OrderDetails` with these members. All but `Payer` are `required`, so the app
  does not build without them:
  - `PaymentProcessorId`: `Nets Easy` for the built-in Nets Easy processor, or the `PaymentProcessorId` of an
    `IPaymentProcessor` you implement and register
  - `Currency`, such as `NOK`
  - `OrderLines`, each with `Id`, `Name`, `PriceExVat`, `VatPercent` and `Quantity`. The app computes the totals.
  - `Receiver`, which the receipt shows
  - `Payer`, optional unless `MerchantHandlesConsumerData` is `true`
- The app calls the calculator more than once for an instance, to show the order and to start the payment. Compute the
  order from the instance's data only, without side effects.
- Outside production, the app also has a processor with the ID `Fake Payment Processor`, for automated frontend
  tests. Production has none, so never ship it as `PaymentProcessorId`.

## Nets Easy

- The service owner needs a Nets Easy agreement, which gives the secret API key.
- A `NetsPaymentSettings` section in `App/appsettings.json` turns on the Nets Easy processor. Without the section,
  starting a payment fails with "Payment processor with ID 'Nets Easy' not found".

  ```json
  "NetsPaymentSettings": {
    "SecretApiKey": "Set in Azure Key Vault",
    "BaseUrl": "https://test.api.dibspayment.eu/",
    "TermsUrl": "https://www.example.no/terms"
  }
  ```

- `SecretApiKey`, `BaseUrl` and `TermsUrl` are required. The Nets Easy page that the version file links describes
  the optional settings.
- Never commit the real key. Store it in the app's Azure Key Vault as the secret `NetsPaymentSettings--SecretApiKey`,
  and load Key Vault as a configuration source, as the secrets page describes. Locally, store Nets' test key as the
  .NET user secret `NetsPaymentSettings:SecretApiKey`.
- Use Nets' test key and test `BaseUrl` outside production. Set the production `BaseUrl` in
  `App/appsettings.Production.json`.
- The platform supplies the secret Nets uses when it calls the app back. Configure nothing for it. The app asks Nets
  for the callback only outside Development, so in a local run the process moves on only when the user clicks the
  button.

## Pages

The `studio-layouts` skill covers pages and components.

- The payment task needs pages of its own, with a `Payment` component. Without it, the user sees an empty page. The
  version files say where the pages live. A `Payment` component cannot be in a subform.
- The app renders the receipt PDF from the payment task's pages. For a separate receipt page, set
  `pages.pdfLayoutName` in the task's `Settings.json` to a page with a `Payment` component that has
  `"renderAsSummary": true`.
- `PaymentDetails` shows the order on a data task's page, before the user pays. It gets the order from your
  `IOrderDetailsCalculator`. How it refetches the order when the form data changes differs between the versions.

## Before you finish

- Both IDs in `paymentConfig` exist in `applicationmetadata.json`. The payment data type is app-owned, and the receipt
  data type allows `application/pdf`.
- The task lists `pay`, `confirm` and `reject`, and a gateway after it routes `reject` and `confirm`.
- The policy grants the payer and the service owner their actions on the payment task's ID, and the payer rule has a
  subject.
- `IOrderDetailsCalculator` is registered, and its `PaymentProcessorId` names a registered processor.
- No `appsettings*.json` file in the repository holds the real key.
