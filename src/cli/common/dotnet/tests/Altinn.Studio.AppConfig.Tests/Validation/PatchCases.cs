namespace Altinn.Studio.AppConfig.Tests.Validation;

internal static class PatchCases
{
    public static readonly (PatchCase Case, string ExpectedRule)[] Violations =
    {
        (
            new(
                "component-dropdown-missing-optionsid",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "thing-select",
                            "type": "Dropdown",
                            "dataModelBindings": { "simpleBinding": "property1" },
                            "optionsId": "doesNotExistOptions"
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-OPTIONS-ID"
        ),
        (
            new(
                "component-group-dangling-children",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "my-group",
                            "type": "Group",
                            "children": ["nonExistentChild", "alsoMissing"],
                            "textResourceBindings": { "title": "My Group" }
                          },
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "property1" }
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-LAYOUT-COMPONENT-ID"
        ),
        (
            new(
                "component-input-duplicate-id",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "property1" }
                          },
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "property2" }
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "UNIQUE-COMPONENT-ID"
        ),
        (
            new(
                "component-input-missing-textresource",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "property1" },
                            "textResourceBindings": { "title": "missing.text.resource.key" }
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-TEXT-RESOURCE-KEY"
        ),
        (
            new(
                "component-input-unknown-binding",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "doesNotExist" }
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-DATAMODEL-PATH"
        ),
        (
            new(
                "component-subform-bad-layoutset",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [
                      { "id": "the-subform", "type": "Subform", "layoutSet": "doesNotExistSet", "textResourceBindings": { "addButton": "Add" } }
                    ] } }
                    """
                )
            ),
            "REF-LAYOUT-SET"
        ),
        (
            new(
                "component-summary-bad-componentref",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [
                      { "id": "the-summary", "type": "Summary", "componentRef": "doesNotExist" },
                      { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                    ] } }
                    """
                )
            ),
            "REF-LAYOUT-COMPONENT-ID"
        ),
        (
            new(
                "component-summary2-bad-target",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [
                      { "id": "the-summary", "type": "Summary2", "target": { "type": "component", "id": "doesNotExist" } },
                      { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                    ] } }
                    """
                )
            ),
            "REF-LAYOUT-COMPONENT-ID"
        ),
        (
            new(
                "component-summary2-bad-target-empty-taskid",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [
                      { "id": "the-summary", "type": "Summary2", "target": { "type": "component", "id": "doesNotExist", "taskId": "" } },
                      { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                    ] } }
                    """
                )
            ),
            "REF-LAYOUT-COMPONENT-ID"
        ),
        (
            new(
                "component-tabs-bad-child",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [
                      { "id": "the-tabs", "type": "Tabs", "tabs": [ { "id": "t1", "title": "T1", "children": ["doesNotExist"] } ] }
                    ] } }
                    """
                )
            ),
            "REF-LAYOUT-COMPONENT-ID"
        ),
        (
            new(
                "options-bad-label-key",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [
                      { "id": "the-radio", "type": "RadioButtons", "options": [ { "value": "1", "label": "some.undeclared.key" } ] }
                    ] } }
                    """
                )
            ),
            "REF-TEXT-RESOURCE-KEY"
        ),
        (
            new(
                "metadata-classref-missing",
                (
                    "App/config/applicationmetadata.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                      "id": "ttd/template-app",
                      "org": "ttd",
                      "title": { "nb": "template-app" },
                      "dataTypes": [
                        {
                          "id": "ref-data-as-pdf",
                          "allowedContentTypes": ["application/pdf"],
                          "maxCount": 0,
                          "minCount": 0,
                          "enablePdfCreation": true,
                          "enableFileScan": false,
                          "validationErrorOnPendingFileScan": false,
                          "enabledFileAnalysers": [],
                          "enabledFileValidators": []
                        },
                        {
                          "id": "model",
                          "allowedContentTypes": ["application/xml"],
                          "appLogic": {
                            "autoCreate": true,
                            "classRef": "Altinn.App.Models.Bogus.NotARealClass",
                            "allowAnonymousOnStateless": false,
                            "autoDeleteOnProcessEnd": false
                          },
                          "taskId": "Task_1",
                          "maxCount": 1,
                          "minCount": 1,
                          "enablePdfCreation": true,
                          "enableFileScan": false,
                          "validationErrorOnPendingFileScan": false,
                          "enabledFileAnalysers": [],
                          "enabledFileValidators": []
                        }
                      ],
                      "partyTypesAllowed": {
                        "bankruptcyEstate": true,
                        "organisation": true,
                        "person": true,
                        "subUnit": true
                      },
                      "autoDeleteOnProcessEnd": false
                    }
                    """
                ),
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-CSHARP-TYPE"
        ),
        (
            new(
                "metadata-onentry-bad-show",
                (
                    "App/config/applicationmetadata.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                      "id": "ttd/template-app",
                      "org": "ttd",
                      "title": { "nb": "template-app" },
                      "dataTypes": [
                        {
                          "id": "ref-data-as-pdf",
                          "allowedContentTypes": ["application/pdf"],
                          "maxCount": 0,
                          "minCount": 0,
                          "enablePdfCreation": true,
                          "enableFileScan": false,
                          "validationErrorOnPendingFileScan": false,
                          "enabledFileAnalysers": [],
                          "enabledFileValidators": []
                        },
                        {
                          "id": "model",
                          "allowedContentTypes": ["application/xml"],
                          "appLogic": {
                            "autoCreate": true,
                            "classRef": "Altinn.App.Models.model.model",
                            "allowAnonymousOnStateless": false,
                            "autoDeleteOnProcessEnd": false
                          },
                          "taskId": "Task_1",
                          "maxCount": 1,
                          "minCount": 1,
                          "enablePdfCreation": true,
                          "enableFileScan": false,
                          "validationErrorOnPendingFileScan": false,
                          "enabledFileAnalysers": [],
                          "enabledFileValidators": []
                        }
                      ],
                      "partyTypesAllowed": {
                        "bankruptcyEstate": true,
                        "organisation": true,
                        "person": true,
                        "subUnit": true
                      },
                      "onEntry": { "show": "doesNotExistSet" },
                      "autoDeleteOnProcessEnd": false
                    }
                    """
                ),
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [ { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } } ] } }
                    """
                )
            ),
            "REF-LAYOUT-SET"
        ),
        (
            new(
                "process-task-missing",
                (
                    "App/config/process/process.bpmn",
                    """
                    <?xml version="1.0" encoding="UTF-8"?>
                    <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no" id="App_Process" targetNamespace="http://bpmn.io/schema/bpmn">
                      <bpmn:process id="Altinn-App-Process" isExecutable="false">
                        <bpmn:startEvent id="StartEvent_1" name="StartEvent" />
                        <bpmn:endEvent id="EndEvent_1" />
                        <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1" />
                      </bpmn:process>
                    </bpmn:definitions>
                    """
                ),
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [ { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } } ] } }
                    """
                )
            ),
            "REF-TASK-ID"
        ),
        (
            new(
                "settings-defaulttype-mismatch",
                (
                    "App/ui/Task_1/Settings.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
                      "pages": {
                        "order": [
                          "Side1"
                        ]
                      },
                      "defaultDataType": "doesNotExist"
                    }
                    """
                ),
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "property1" }
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-DATATYPE-ID"
        ),
        (
            new(
                "settings-page-missing",
                (
                    "App/ui/Task_1/Settings.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
                      "pages": {
                        "order": [
                          "DoesNotExist",
                          "Side1"
                        ]
                      },
                      "defaultDataType": "model"
                    }
                    """
                ),
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-PAGE-FILE"
        ),
        (
            new(
                "expr-datamodel-unknown-binding",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "property1" },
                            "hidden": ["equals", ["dataModel", "doesNotExist"], "x"]
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-DATAMODEL-PATH"
        ),
        (
            new(
                "expr-component-bad-ref",
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                      "data": {
                        "hidden": false,
                        "layout": [
                          {
                            "id": "property1-input",
                            "type": "Input",
                            "dataModelBindings": { "simpleBinding": "property1" },
                            "hidden": ["equals", ["component", "doesNotExist"], "x"]
                          }
                        ]
                      }
                    }
                    """
                )
            ),
            "REF-LAYOUT-COMPONENT-ID"
        ),
        (
            new(
                "component-repeatinggroup-child-indexed-binding",
                (
                    "App/models/model.schema.json",
                    """
                    {
                      "$schema": "https://json-schema.org/draft/2020-12/schema",
                      "type": "object",
                      "properties": {
                        "property1": { "type": "string" },
                        "items": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "subfield": { "type": "string" }
                            }
                          }
                        }
                      }
                    }
                    """
                ),
                (
                    "App/ui/Task_1/layouts/Side1.json",
                    """
                    { "data": { "hidden": false, "layout": [
                      { "id": "rep-group", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" },
                        "children": [ "indexed-child" ] },
                      { "id": "indexed-child", "type": "Input", "dataModelBindings": { "simpleBinding": "items[0].subfield" } }
                    ] } }
                    """
                )
            ),
            "CROSS-REPGROUP-CHILD-INDEX"
        ),
    };

    public static readonly PatchCase[] CleanVariations =
    {
        new(
            "asset-no-leading-slash",
            (
                "App/ui/Task_1/layouts/Side1.json",
                """
                {
                  "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                  "data": {
                    "hidden": false,
                    "layout": [
                      { "id": "logo", "type": "Image", "image": { "src": { "nb": "logo.png" }, "width": "100px", "align": "center" } }
                    ]
                  }
                }
                """
            ),
            (
                "App/wwwroot/logo.png",
                """
                stub
                """
            )
        ),
        new(
            "summary2-valid-target",
            (
                "App/ui/Task_1/layouts/Side1.json",
                """
                { "data": { "hidden": false, "layout": [
                  { "id": "the-summary", "type": "Summary2", "target": { "type": "page", "id": "Side1" } },
                  { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                ] } }
                """
            )
        ),
        new(
            "layout-orphan-file",
            (
                "App/ui/Task_1/layouts/Side1.json",
                """
                {
                  "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                  "data": {
                    "hidden": false,
                    "layout": [
                      { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                    ]
                  }
                }
                """
            ),
            (
                "App/ui/Task_1/layouts/Unused.json",
                """
                {
                  "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                  "data": {
                    "hidden": false,
                    "layout": [
                      { "id": "property1-input", "type": "Input", "dataModelBindings": { "simpleBinding": "property1" } }
                    ]
                  }
                }
                """
            )
        ),
        new(
            "policy-uncommon-role",
            (
                "App/config/authorization/policy.xml",
                """
                <?xml version="1.0" encoding="utf-8"?>
                <xacml:Policy PolicyId="urn:altinn:resource:app_ttd_template-app:policyid:1" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides" xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17">
                  <xacml:Target />
                  <xacml:Rule RuleId="urn:altinn:resource:app_ttd_template-app:policyid:1:ruleid:1" Effect="Permit">
                    <xacml:Description>Regel for sluttbruker: Gir rettighetene Les, Skriv, Slett og Start til brukere med rollene Privatperson (PRIV) og Daglig leder (DAGL), for hele tjenesten. </xacml:Description>
                    <xacml:Target>
                      <xacml:AnyOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">BOBE</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:altinn:rolecode" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">KOMK</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:altinn:rolecode" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                      </xacml:AnyOf>
                      <xacml:AnyOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">ttd</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">template-app</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                      </xacml:AnyOf>
                      <xacml:AnyOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">read</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">write</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">delete</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">instantiate</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                      </xacml:AnyOf>
                    </xacml:Target>
                  </xacml:Rule>
                  <xacml:Rule RuleId="urn:altinn:resource:app_ttd_template-app:policyid:1:ruleid:2" Effect="Permit">
                    <xacml:Description>Regel for tjenesteeier: Gir rettighetene Les, Skriv, Start, Bekreft mottatt tjenesteeier til organisasjonen som eier tjenesten ([org]).</xacml:Description>
                    <xacml:Target>
                      <xacml:AnyOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">[org]</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                      </xacml:AnyOf>
                      <xacml:AnyOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">ttd</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">template-app</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                      </xacml:AnyOf>
                      <xacml:AnyOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">read</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">write</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">instantiate</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                        <xacml:AllOf>
                          <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                            <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">complete</xacml:AttributeValue>
                            <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                          </xacml:Match>
                        </xacml:AllOf>
                      </xacml:AnyOf>
                    </xacml:Target>
                  </xacml:Rule>
                  <xacml:ObligationExpressions>
                    <xacml:ObligationExpression ObligationId="urn:altinn:obligation:authenticationLevel1" FulfillOn="Permit">
                      <xacml:AttributeAssignmentExpression AttributeId="urn:altinn:obligation1-assignment1" Category="urn:altinn:minimum-authenticationlevel">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#integer">2</xacml:AttributeValue>
                      </xacml:AttributeAssignmentExpression>
                    </xacml:ObligationExpression>
                    <xacml:ObligationExpression ObligationId="urn:altinn:obligation:authenticationLevel2" FulfillOn="Permit">
                      <xacml:AttributeAssignmentExpression AttributeId="urn:altinn:obligation2-assignment2" Category="urn:altinn:minimum-authenticationlevel-org">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#integer">3</xacml:AttributeValue>
                      </xacml:AttributeAssignmentExpression>
                    </xacml:ObligationExpression>
                  </xacml:ObligationExpressions>
                </xacml:Policy>
                """
            )
        ),
        new(
            "text-resource-flat-key",
            (
                "App/config/texts/resource.nb.json",
                """
                {
                  "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/text-resources/text-resources.schema.v1.json",
                  "language": "nb",
                  "resources": [
                    { "id": "submitButton", "value": "Send inn" }
                  ]
                }
                """
            ),
            (
                "App/ui/Task_1/layouts/Side1.json",
                """
                {
                  "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                  "data": {
                    "hidden": false,
                    "layout": [
                      {
                        "id": "property1-input",
                        "type": "Input",
                        "dataModelBindings": { "simpleBinding": "property1" },
                        "textResourceBindings": { "title": "submitButton" }
                      }
                    ]
                  }
                }
                """
            )
        ),
        new(
            "process-usertask",
            (
                "App/config/process/process.bpmn",
                "\uFEFF"
                    + """
                    <?xml version="1.0" encoding="utf-8"?>
                    <bpmn:definitions id="Altinn_SingleDataTask_Process_Definition" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">
                      <bpmn:process id="SingleDataTask" isExecutable="false">
                        <bpmn:startEvent id="StartEvent_1">
                          <bpmn:outgoing>SequenceFlow_1n56yn5</bpmn:outgoing>
                        </bpmn:startEvent>
                        <bpmn:userTask id="Task_1" name="Utfylling">
                          <bpmn:incoming>SequenceFlow_1n56yn5</bpmn:incoming>
                          <bpmn:outgoing>SequenceFlow_1oot28q</bpmn:outgoing>
                          <bpmn:extensionElements>
                            <altinn:taskExtension>
                              <altinn:taskType>data</altinn:taskType>
                            </altinn:taskExtension>
                          </bpmn:extensionElements>
                        </bpmn:userTask>
                        <bpmn:endEvent id="EndEvent_1">
                          <bpmn:incoming>SequenceFlow_1oot28q</bpmn:incoming>
                        </bpmn:endEvent>
                        <bpmn:sequenceFlow id="SequenceFlow_1n56yn5" sourceRef="StartEvent_1" targetRef="Task_1" />
                        <bpmn:sequenceFlow id="SequenceFlow_1oot28q" sourceRef="Task_1" targetRef="EndEvent_1" />
                      </bpmn:process>
                      <bpmndi:BPMNDiagram id="BPMNDiagram_1">
                        <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="SingleDataTask">
                          <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
                            <dc:Bounds x="156" y="81" width="36" height="36" />
                          </bpmndi:BPMNShape>
                          <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
                            <dc:Bounds x="300" y="59" width="100" height="80" />
                          </bpmndi:BPMNShape>
                          <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
                            <dc:Bounds x="512" y="81" width="36" height="36" />
                          </bpmndi:BPMNShape>
                          <bpmndi:BPMNEdge id="SequenceFlow_1n56yn5_di" bpmnElement="SequenceFlow_1n56yn5">
                            <di:waypoint x="192" y="99" />
                            <di:waypoint x="300" y="99" />
                          </bpmndi:BPMNEdge>
                          <bpmndi:BPMNEdge id="SequenceFlow_1oot28q_di" bpmnElement="SequenceFlow_1oot28q">
                            <di:waypoint x="400" y="99" />
                            <di:waypoint x="512" y="99" />
                          </bpmndi:BPMNEdge>
                        </bpmndi:BPMNPlane>
                      </bpmndi:BPMNDiagram>
                    </bpmn:definitions>
                    """
            )
        ),
        new(
            "csharp-record-classref",
            (
                "App/models/model.cs",
                """
                using System;
                using System.Collections.Generic;
                using System.ComponentModel.DataAnnotations;
                using System.Linq;
                using System.Text.Json.Serialization;
                using System.Xml.Serialization;
                using Microsoft.AspNetCore.Mvc.ModelBinding;
                using Newtonsoft.Json;

                namespace Altinn.App.Models.model
                {
                    [XmlRoot(ElementName = "model")]
                    public record class model
                    {
                        [XmlElement("property1", Order = 1)]
                        [JsonProperty("property1")]
                        [JsonPropertyName("property1")]
                        public string property1 { get; set; }

                        [XmlElement("property2", Order = 2)]
                        [JsonProperty("property2")]
                        [JsonPropertyName("property2")]
                        public string property2 { get; set; }

                        [XmlElement("property3", Order = 3)]
                        [JsonProperty("property3")]
                        [JsonPropertyName("property3")]
                        public string property3 { get; set; }
                    }
                }
                """
            )
        ),
        new(
            "component-repeatinggroup-child-outside-group-path",
            (
                "App/models/model.schema.json",
                """
                {
                  "$schema": "https://json-schema.org/draft/2020-12/schema",
                  "type": "object",
                  "info": {
                    "rootNode": ""
                  },
                  "@xsdNamespaces": {
                    "xsd": "http://www.w3.org/2001/XMLSchema",
                    "xsi": "http://www.w3.org/2001/XMLSchema-instance",
                    "seres": "http://seres.no/xsd/forvaltningsdata"
                  },
                  "@xsdSchemaAttributes": {
                    "AttributeFormDefault": "Unqualified",
                    "ElementFormDefault": "Qualified",
                    "BlockDefault": "None",
                    "FinalDefault": "None"
                  },
                  "@xsdRootElement": "model",
                  "properties": {
                    "property1": {
                      "type": "string"
                    },
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "subfield": { "type": "string" }
                        }
                      }
                    },
                    "property2": {
                      "type": "string"
                    },
                    "property3": {
                      "type": "string"
                    }
                  },
                  "required": [
                    "property1",
                    "property2"
                  ]
                }
                """
            ),
            (
                "App/ui/Task_1/layouts/Side1.json",
                """
                { "data": { "hidden": false, "layout": [
                  { "id": "rep-group", "type": "RepeatingGroup", "dataModelBindings": { "group": "items" },
                    "children": [ "stray-child" ] },
                  { "id": "stray-child", "type": "Input", "dataModelBindings": { "simpleBinding": "property2" } }
                ] } }
                """
            )
        ),
        new(
            "settings-pages-groups",
            (
                "App/ui/Task_1/Settings.json",
                """
                {
                  "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layoutSettings.schema.v1.json",
                  "pages": {
                    "groups": [
                      { "name": "Group1", "order": ["Side1", "Side2"] }
                    ]
                  },
                  "defaultDataType": "model"
                }
                """
            ),
            (
                "App/ui/Task_1/layouts/Side2.json",
                """
                {
                  "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                  "data": {
                    "hidden": false,
                    "layout": []
                  }
                }
                """
            )
        ),
    };

    public static PatchCase ByName(string name)
    {
        foreach (var (patchCase, _) in Violations)
            if (patchCase.Name == name)
                return patchCase;
        foreach (var patchCase in CleanVariations)
            if (patchCase.Name == name)
                return patchCase;
        throw new ArgumentException($"unknown patch case: {name}", nameof(name));
    }
}
