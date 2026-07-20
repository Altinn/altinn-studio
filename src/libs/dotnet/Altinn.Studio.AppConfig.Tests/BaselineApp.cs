using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Tests;

public sealed record PatchCase(string Name, params (string Path, string Content)[] Files);

internal static class BaselineApp
{
    public static InMemoryAppDirectory Load()
    {
        var dir = new InMemoryAppDirectory();
        foreach (var (path, content) in _files)
            dir.Set(path, content);
        return dir;
    }

    public static InMemoryAppDirectory Load(PatchCase patchCase)
    {
        var dir = Load();
        foreach (var (path, content) in patchCase.Files)
            dir.Set(path, content);
        return dir;
    }

    private static readonly (string Path, string Content)[] _files =
    {
        (
            "App/App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <AssemblyName>Altinn.Application</AssemblyName>
                <RootNamespace>Altinn.App</RootNamespace>
              </PropertyGroup>
              <ItemGroup>
                <ProjectReference Include="../../../App/backend/src/Altinn.App.Api/Altinn.App.Api.csproj" />
                <ProjectReference Include="../../../App/backend/src/Altinn.App.Core/Altinn.App.Core.csproj" />
              </ItemGroup>
              <ItemGroup>
                <Folder Include="wwwroot\css\" />
                <Folder Include="wwwroot\script\" />
              </ItemGroup>
              <ItemGroup>
                <None Update="config\process\process.bpmn">
                  <CopyToOutputDirectory>Always</CopyToOutputDirectory>
                </None>
                <None Update="JWTValidationCert.cer">
                  <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
                </None>
                <None Update="**\RuleHandler.js">
                  <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
                </None>
              </ItemGroup>
              <PropertyGroup>
                <GenerateDocumentationFile>true</GenerateDocumentationFile>
                <NoWarn>$(NoWarn);1591</NoWarn>
              </PropertyGroup>
              <Target Name="CopyXMLFromPackagesForBuild" AfterTargets="Build">
                <ItemGroup>
                  <PackageReferenceFiles Condition="%(PackageReference.CopyToOutputDirectory) != ''" Include="$(NugetPackageRoot)$([MSBuild]::Escape('%(PackageReference.Identity)').ToLower())/%(PackageReference.Version)/%(PackageReference.CopyToOutputDirectory)" />
                </ItemGroup>
                <Copy SourceFiles="@(PackageReferenceFiles)" DestinationFolder="$(OutDir)" />
              </Target>
            </Project>
            """
        ),
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
              "autoDeleteOnProcessEnd": false
            }
            """
        ),
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
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">priv</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:altinn:rolecode" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                      </xacml:Match>
                    </xacml:AllOf>
                    <xacml:AllOf>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">dagl</xacml:AttributeValue>
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
        ),
        (
            "App/config/process/process.bpmn",
            """
            <?xml version="1.0" encoding="utf-8"?>
            <bpmn:definitions id="Altinn_SingleDataTask_Process_Definition" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">
              <bpmn:process id="SingleDataTask" isExecutable="false">
                <bpmn:startEvent id="StartEvent_1">
                  <bpmn:outgoing>SequenceFlow_1n56yn5</bpmn:outgoing>
                </bpmn:startEvent>
                <bpmn:task id="Task_1" name="Utfylling">
                  <bpmn:incoming>SequenceFlow_1n56yn5</bpmn:incoming>
                  <bpmn:outgoing>SequenceFlow_1oot28q</bpmn:outgoing>
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>data</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
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
        ),
        (
            "App/config/texts/resource.nb.json",
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/text-resources/text-resources.schema.v1.json",
              "language": "nb",
              "resources": []
            }
            """
        ),
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
                public class model
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
        ),
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
            "App/models/model.xsd",
            """
            <?xml version="1.0" encoding="utf-8"?>
            <xsd:schema xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:seres="http://seres.no/xsd/forvaltningsdata" xmlns:xs="http://www.w3.org/2001/XMLSchema" attributeFormDefault="unqualified" elementFormDefault="qualified" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
              <xs:annotation>
                <xs:documentation>
                  <xsd:attribute name="rootNode" fixed="" />
                </xs:documentation>
              </xs:annotation>
              <xs:element name="model">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="property1" type="xs:string" />
                    <xs:element name="property2" type="xs:string" />
                    <xs:element minOccurs="0" name="property3" type="xs:string" />
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xsd:schema>
            """
        ),
        (
            "App/ui/footer.json",
            """
            {
              "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/footer.schema.v1.json",
              "footer": [
                {
                  "type": "Link",
                  "icon": "information",
                  "title": "general.accessibility",
                  "target": "general.accessibility_url"
                }
              ]
            }
            """
        ),
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
                "layout": []
              }
            }
            """
        ),
    };
}
