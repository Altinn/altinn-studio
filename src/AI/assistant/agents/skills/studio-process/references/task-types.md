# Task configuration by type

This file shows the XML each task type needs, except signing and payment, which have skills of their own. The
examples leave out `<bpmn:incoming>` and `<bpmn:outgoing>`, which every task has. Every element under `altinn:` is
in `http://altinn.no/process`. Where v8 and v9 differ, the section says so.

## Contents

- data
- confirmation
- feedback
- signing
- payment
- pdf
- subformPdf
- eFormidling
- fiksArkiv
- Your own task type
- The env attribute

## data

```xml
<bpmn:task id="Task_1" name="Utfylling">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>data</altinn:taskType>
    </altinn:taskExtension>
  </bpmn:extensionElements>
</bpmn:task>
```

A data task usually has pages, and a data type bound to the task: its `taskId` is the task's id in v8, and its
`taskIds` lists the task's id in v9.

## confirmation

```xml
<bpmn:task id="Task_2" name="Bekreft">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>confirmation</altinn:taskType>
      <altinn:actions>
        <altinn:action>confirm</altinn:action>
      </altinn:actions>
    </altinn:taskExtension>
  </bpmn:extensionElements>
</bpmn:task>
```

Without `confirm` in the list, the frontend disables the submit button.

## feedback

Like `data`, with `<altinn:taskType>feedback</altinn:taskType>` and no actions. The frontend waits on the task. An
external system or the service owner moves the process on with `PUT .../process/next`, which needs `write`.

## signing

The `studio-signing` skill has the XML for a signing task, and the signee providers, Correspondence, data types,
pages and policy that go with it.

## payment

The `studio-payment` skill has the XML for a payment task, and the data types, payment processor, pages and policy
that go with it.

## pdf

```xml
<bpmn:serviceTask id="PdfTask_Task_1" name="Lag PDF">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>pdf</altinn:taskType>
      <altinn:pdfConfig>
        <altinn:filenameTextResourceKey>pdf-filename</altinn:filenameTextResourceKey> <!-- optional -->
        <altinn:autoPdfTaskIds>
          <altinn:taskId>Task_1</altinn:taskId>
        </altinn:autoPdfTaskIds>
      </altinn:pdfConfig>
    </altinn:taskExtension>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

- `autoPdfTaskIds` renders the pages of the listed tasks in summary mode.
- For a PDF of your own pages, leave out `autoPdfTaskIds` and give the PDF task UI of its own with
  `pages.pdfLayoutName` in its `Settings.json`. In v8 that is a layout set that lists the PDF task. In v9 it is
  `ui/<pdfTaskId>/`.
- The app stores the PDF in the data type `ref-data-as-pdf`, which must exist with
  `"allowedContentTypes": ["application/pdf"]`.

## subformPdf

One PDF per subform entry. The settings differ between the versions.

v8:

```xml
<bpmn:serviceTask id="Task_SubformPdf" name="PDF for underskjema">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>subformPdf</altinn:taskType>
      <altinn:subformPdfConfig>
        <altinn:filenameTextResourceKey>subform-pdf-filename</altinn:filenameTextResourceKey> <!-- optional -->
        <altinn:subformComponentId>subform-component</altinn:subformComponentId>
        <altinn:subformDataTypeId>subformModel</altinn:subformDataTypeId>
      </altinn:subformPdfConfig>
    </altinn:taskExtension>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

v9 names the subform's UI folder instead. `subformComponentId` and `subformDataTypeId` are build errors there.

```xml
<altinn:subformPdfConfig>
  <altinn:filenameTextResourceKey>subform-pdf-filename</altinn:filenameTextResourceKey> <!-- optional -->
  <altinn:subformUiFolder>Subform</altinn:subformUiFolder>
</altinn:subformPdfConfig>
```

## eFormidling

The task holds the whole shipment configuration. The `studio-integrations` skill owns what to put in it, and the
services and settings the app needs.

```xml
<bpmn:serviceTask id="Task_eFormidling" name="Send med eFormidling">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>eFormidling</altinn:taskType>
      <altinn:eFormidlingConfig>
        <altinn:disabled env="development">true</altinn:disabled>
        <altinn:receiver>910075918</altinn:receiver>
        <altinn:process>urn:no:difi:profile:arkivmelding:administrasjon:ver1.0</altinn:process>
        <altinn:standard>urn:no:difi:arkivmelding:xsd::arkivmelding</altinn:standard>
        <altinn:typeVersion>2.0</altinn:typeVersion>
        <altinn:type>arkivmelding</altinn:type>
        <altinn:securityLevel>3</altinn:securityLevel>
        <altinn:dpfShipmentType>altinn3.skjema</altinn:dpfShipmentType>
        <altinn:dataTypes>
          <altinn:dataType>model</altinn:dataType>
          <altinn:dataType>ref-data-as-pdf</altinn:dataType>
        </altinn:dataTypes>
      </altinn:eFormidlingConfig>
    </altinn:taskExtension>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

- `process`, `standard`, `typeVersion`, `type` and `securityLevel` (an integer) are required in the environment the
  app runs in, even when `disabled` is `true`.
- `receiver`, `dpfShipmentType`, `dataTypes` and `disabled` are optional. Without `disabled` the task sends.
- `disabled` takes `true` or `false`.
- Every id in `dataTypes` must exist in `applicationmetadata.json`.

## fiksArkiv

The task holds only its type. The settings are in `FiksArkivSettings` in `appsettings.json`, which the
`studio-integrations` skill covers. The app must call `services.AddFiksArkiv()` from the `Altinn.App.Clients.Fiks`
package. In v9 an exclusive gateway with at least two outgoing flows must follow the task, as the v9 version file
explains.

```xml
<bpmn:serviceTask id="Task_FiksArkiv" name="Fiks Arkiv">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>fiksArkiv</altinn:taskType>
    </altinn:taskExtension>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

## Your own task type

The type is the `Type` property of a class the app registers in `Program.cs`. Use `<bpmn:serviceTask>` for an
`IServiceTask` and `<bpmn:task>` for an `IProcessTask`. The `studio-app-lib` skill covers the class.

```xml
<bpmn:serviceTask id="Task_Archive" name="Arkiver">
  <bpmn:extensionElements>
    <altinn:taskExtension>
      <altinn:taskType>archiveCase</altinn:taskType>
    </altinn:taskExtension>
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

## The env attribute

`correspondenceResource` in `signatureConfig` and every element in `eFormidlingConfig` can differ per environment
with an `env` attribute. Write the attribute name in lowercase and without a prefix:

```xml
<altinn:disabled env="production">false</altinn:disabled>
<altinn:disabled>true</altinn:disabled>
```

- The app uses the entry whose `env` matches the environment it runs in, and otherwise the entry without `env`.
  Among several matching entries the last one wins.
- Use one of these values, in any case. A value not in the list matches no environment.
  - Development: `development`, `dev`, `local`, `localtest`
  - Staging: `staging`, `test`, `at22`, `at23`, `at24`, `tt02`, `yt01`
  - Production: `production`, `prod`, `produksjon`
