using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class InMemoryAppDirectoryTests
{
    [Fact]
    public void Loads_And_Validates_From_InMemory_Directory()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/in-memory"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["Page1","MissingPage"]}}""",
                ["App/ui/Task_1/layouts/Page1.json"] = """{"data":{"layout":[]}}""",
            }
        );

        var app = AppConfigEngine.Open(dir).Build();

        Assert.Equal("ttd/in-memory", app.ApplicationId);
        Assert.Contains("App/ui/Task_1/layouts/Page1.json", app.LayoutFiles);

        var report = ValidationEngine.Run(app);

        Assert.Contains(report.Findings, f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("MissingPage"));
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("Page1\""));
    }

    [Fact]
    public void ResolvePosition_FillsRange_ForJsonFinding()
    {
        const string settings =
            "{\n  \"pages\": {\n    \"order\": [\n      \"Page1\",\n      \"MissingPage\"\n    ]\n  }\n}";
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/pos"),
                ["App/ui/Task_1/Settings.json"] = settings,
                ["App/ui/Task_1/layouts/Page1.json"] = """{"data":{"layout":[]}}""",
            }
        );
        var engine = AppConfigEngine.Open(dir);
        var report = ValidationEngine.Run(engine.Build());

        var finding = report.Findings.Single(f => f.RuleId == "REF-PAGE-FILE");
        Assert.Equal(0, finding.Position.Line);
        Assert.Equal("/pages/order/1", finding.Position.Pointer);

        var resolved = engine.ResolvePosition(finding.Position);
        Assert.Equal(5, resolved.Line);
        Assert.Equal(7, resolved.Column);
        Assert.Equal(5, resolved.EndLine);
        Assert.Equal(20, resolved.EndColumn);
    }

    [Fact]
    public void ResolvePosition_TargetsPropertyKey_WhenKeyHintSet()
    {
        const string meta = "{\n  \"id\": \"ttd/x\",\n  \"access\": { \"read\": true }\n}";
        var dir = new InMemoryAppDirectory(new() { ["App/config/applicationmetadata.json"] = meta });
        var engine = AppConfigEngine.Open(dir);
        const string file = "App/config/applicationmetadata.json";

        var value = engine.ResolvePosition(new SourceSpan(file, "/access"));
        Assert.Equal(13, value.Column); // '{'
        Assert.Equal(29, value.EndColumn);

        var key = engine.ResolvePosition(new SourceSpan(file, "/access", Key: true));
        Assert.Equal(3, key.Line);
        Assert.Equal(3, key.Column);
        Assert.Equal(3, key.EndLine);
        Assert.Equal(11, key.EndColumn); // '"'
    }

    [Fact]
    public void ObjectFormDataModelBindings_ValidateFieldAndDataType()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  { "id": "addr", "type": "Input",
                    "dataModelBindings": { "simpleBinding": { "dataType": "model", "field": "project.address" } } },
                  { "id": "gnr", "type": "Input",
                    "dataModelBindings": { "simpleBinding": { "dataType": "model", "field": "project.gnre" } } },
                  { "id": "bnr", "type": "Input",
                    "dataModelBindings": { "simpleBinding": { "dataType": "modele", "field": "project.bnr" } } }
                ]
              }
            }
            """;
        const string model = """
            { "properties": { "project": { "type": "object", "properties": {
                "address": { "type": "string" }, "gnr": { "type": "string" }, "bnr": { "type": "string" } } } } }
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/obj", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] = model,
            }
        );
        var engine = AppConfigEngine.Open(dir);

        var report = ValidationEngine.Run(engine.Build());

        var pathFinding = Assert.Single(report.Findings, f => f.RuleId == "REF-DATAMODEL-PATH");
        Assert.Contains("project.gnre", pathFinding.Message);
        Assert.Contains("\"model\"", pathFinding.Message);

        var typeFinding = Assert.Single(report.Findings, f => f.RuleId == "REF-DATATYPE-ID");
        Assert.Contains("modele", typeFinding.Message);
    }

    [Fact]
    public void DataTypeAwareBinding_FlagsPathValidInOtherModel_ButNotInBoundDataType()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  { "id": "wrong-model", "type": "Input",
                    "dataModelBindings": { "simpleBinding": { "dataType": "other", "field": "project.address" } } },
                  { "id": "correct", "type": "Input",
                    "dataModelBindings": { "simpleBinding": { "dataType": "other", "field": "applicant.fnr" } } }
                ]
              }
            }
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/multi","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"other","appLogic":{"classRef":"O"},"taskId":"Task_1"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"address":{"type":"string"}}}}}""",
                ["App/models/other.schema.json"] =
                    """{"properties":{"applicant":{"type":"object","properties":{"fnr":{"type":"string"}}}}}""",
            }
        );
        var engine = AppConfigEngine.Open(dir);
        var report = ValidationEngine.Run(engine.Build());

        var paths = report.Findings.Where(f => f.RuleId == "REF-DATAMODEL-PATH").ToList();
        var path = Assert.Single(paths);
        Assert.Contains("project.address", path.Message);
        Assert.Contains("\"other\"", path.Message);
    }

    [Fact]
    public void StringFormBinding_ResolvesViaOwningTaskFormDataType()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  { "id": "ok", "type": "Input", "dataModelBindings": { "simpleBinding": "project.address" } },
                  { "id": "bad", "type": "Input", "dataModelBindings": { "simpleBinding": "applicant.fnr" } }
                ]
              }
            }
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/single","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"other","appLogic":{"classRef":"O"},"taskId":"Other_Task"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"address":{"type":"string"}}}}}""",
                ["App/models/other.schema.json"] =
                    """{"properties":{"applicant":{"type":"object","properties":{"fnr":{"type":"string"}}}}}""",
            }
        );
        var engine = AppConfigEngine.Open(dir);
        var report = ValidationEngine.Run(engine.Build());

        var paths = report.Findings.Where(f => f.RuleId == "REF-DATAMODEL-PATH").ToList();
        var path = Assert.Single(paths);
        Assert.Contains("applicant.fnr", path.Message);
        Assert.Contains("\"model\"", path.Message);
    }

    [Fact]
    public void BindingKind_LooksUpInBoundDataTypesSchema_NotUnion()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"warns",  "type":"Input",
                "dataModelBindings":{"simpleBinding":{"dataType":"model",  "field":"list"}}},
              {"id":"silent", "type":"Input",
                "dataModelBindings":{"simpleBinding":{"dataType":"model2", "field":"list"}}}
            ]}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/bk","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"model2","appLogic":{"classRef":"M2"},"taskId":"Task_1"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"list":{"type":"array","items":{"type":"string"}}}}""",
                ["App/models/model2.schema.json"] = """{"properties":{"list":{"type":"string"}}}""",
            }
        );
        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var kinds = report.Findings.Where(f => f.RuleId == "BINDING-KIND").ToList();
        var kind = Assert.Single(kinds);
        Assert.Contains("warns", kind.Message);
        Assert.Contains("\"model\"", kind.Message);
    }

    [Fact]
    public void RepGroupChild_CrossDataTypeBinding_Resolves()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup",
                "dataModelBindings":{"group":{"dataType":"model","field":"items"}},
                "children":["child"]},
              {"id":"child","type":"Input",
                "dataModelBindings":{"simpleBinding":{"dataType":"model2","field":"items.x"}}}
            ]}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/rg","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"model2","appLogic":{"classRef":"M2"},"taskId":"Task_1"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"items":{"type":"array","items":{"type":"object","properties":{"x":{"type":"string"}}}}}}""",
                ["App/models/model2.schema.json"] =
                    """{"properties":{"items":{"type":"object","properties":{"x":{"type":"string"}}}}}""",
            }
        );
        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void TextResourceCoverage_FlagsKeyMissingFromOtherLanguage()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/lang","org":"ttd","title":{"nb":"Norsk","nn":"Nynorsk"},"partyTypesAllowed":{},"dataTypes":[]}""",
                ["App/config/texts/resource.nb.json"] =
                    """{"language":"nb","resources":[{"id":"shared","value":"Delt"},{"id":"only-nb","value":"Bare bokmål"}]}""",
                ["App/config/texts/resource.nn.json"] =
                    """{"language":"nn","resources":[{"id":"shared","value":"Delt"}]}""",
            }
        );
        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var coverage = report.Findings.Where(f => f.RuleId == "TEXT-RESOURCE-COVERAGE").ToList();
        Assert.Single(coverage);
        Assert.Contains("only-nb", coverage[0].Message);
        Assert.Contains("resource.nb.json", coverage[0].Message);
        Assert.Contains("resource.nn.json", coverage[0].Message);
        Assert.Equal(Severity.Info, coverage[0].Severity);
    }

    [Fact]
    public void AmbiguousTask_FallsBackToUnionCheck_NoFalsePositive()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  { "id": "x", "type": "Input", "dataModelBindings": { "simpleBinding": "project.address" } }
                ]
              }
            }
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/amb","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"a","appLogic":{"classRef":"A"},"taskId":"Task_1"},{"id":"b","appLogic":{"classRef":"B"},"taskId":"Task_1"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/a.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"address":{"type":"string"}}}}}""",
            }
        );
        var engine = AppConfigEngine.Open(dir);
        var report = ValidationEngine.Run(engine.Build());

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void ArrayIndexBindings_ResolveAgainstItemsSchema()
    {
        const string layout = """
            {
              "data": {
                "layout": [
                  { "id": "ok", "type": "Input",
                    "dataModelBindings": { "simpleBinding": "lines[0].amount" } },
                  { "id": "bad", "type": "Input",
                    "dataModelBindings": { "simpleBinding": "lines[0].missing" } }
                ]
              }
            }
            """;
        const string model = """
            {
              "type": "object",
              "oneOf": [ { "$ref": "#/$defs/Skjema" } ],
              "$defs": {
                "Skjema": { "type": "object", "properties": {
                  "lines": { "type": "array", "items": { "$ref": "#/$defs/Line" } } } },
                "Line": { "type": "object", "properties": { "amount": { "type": "string" } } }
              }
            }
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/arr", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] = model,
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var single = Assert.Single(report.Findings, f => f.RuleId == "REF-DATAMODEL-PATH");
        Assert.Contains("lines[0].missing", single.Message);
    }

    [Fact]
    public void MalformedFile_IsFlagged_AndOtherFilesStillValidate()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["Bad","Missing"]}}""",
                ["App/ui/Task_1/layouts/Bad.json"] = "{ \"data\": { \"layout\": [ ",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var syntax = Assert.Single(report.Findings, f => f.RuleId == "SYNTAX-VALID");
        Assert.Equal("App/ui/Task_1/layouts/Bad.json", syntax.Position.File);
        Assert.True(syntax.Position.Line > 0);

        Assert.Contains(report.Findings, f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("Missing"));
    }

    [Fact]
    public void OptionsId_CodeRegisteredProvider_IsNotFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/o"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"dd","type":"Dropdown","optionsId":"land"}]}}""",
                ["App/logic/options/LandProvider.cs"] =
                    "namespace App.Options { public class LandProvider : IAppOptionsProvider { public string Id { get; set; } = \"land\"; } }",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-OPTIONS-ID");
    }

    [Fact]
    public void TextResourceBinding_LiteralMarkup_IsNotFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/t"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"brk","type":"Paragraph","textResourceBindings":{"title":"<br>"}}]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY");
    }

    [Fact]
    public void DuplicateSchemaFindings_AreCollapsed()
    {
        const string layout =
            """{"data":{"layout":[{"id":"h","type":"Header","textResourceBindings":{"title":"t"}}]}}""";
        // Two identical allOf branches yield the same "size" error twice; Normalize must collapse them.
        const string layoutSchema = """
            {"properties":{"data":{"properties":{"layout":{"items":{
              "allOf":[{"required":["size"]},{"required":["size"]}]
            }}}}}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/d"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
            }
        );
        var schemas = SchemaSet.FromFiles(
            new Dictionary<string, string> { ["layout/layout.schema.v1.json"] = layoutSchema }
        );

        var report = AppConfigEngine.Open(dir).ValidateSchemas(schemas);

        Assert.Equal(report.Findings.Count, report.Findings.Distinct().Count());
        Assert.Equal(1, report.Findings.Count(f => f.RuleId == "JSONSCHEMA-VALID" && f.Message.Contains("size")));
    }

    [Fact]
    public void BindingKind_FlagsGroupNonArrayAndSimpleBindingArray()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"project.scalar"}},
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"project.list"}}
            ]}}
            """;
        const string model = """
            {"properties":{"project":{"type":"object","properties":{
              "scalar":{"type":"string"},
              "list":{"type":"array","items":{"type":"object","properties":{"x":{"type":"string"}}}}
            }}}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/k","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] = model,
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(
            report.Findings,
            f => f.RuleId == "BINDING-KIND" && f.Severity == Severity.Error && f.Message.Contains("project.scalar")
        );
        Assert.Contains(
            report.Findings,
            f => f.RuleId == "BINDING-KIND" && f.Severity == Severity.Warning && f.Message.Contains("project.list")
        );
    }

    [Fact]
    public void DuplicatePageInOrder_IsFlaggedOnce()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/p"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1","P2","P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/Task_1/layouts/P2.json"] = """{"data":{"layout":[]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var single = Assert.Single(report.Findings, f => f.RuleId == "UNIQUE-PAGE-IN-ORDER");
        Assert.Contains("P1", single.Message);
    }

    [Fact]
    public void DataTypeCounts_FormMustBeMaxOne_AndRangeSane()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/d","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"formBad","maxCount":2,"minCount":1,"appLogic":{"classRef":"App.X"}},{"id":"rangeBad","maxCount":2,"minCount":5},{"id":"ok","maxCount":1,"minCount":1,"appLogic":{"classRef":"App.Y"}}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":[]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(
            report.Findings,
            f => f.RuleId == "DATATYPE-COUNT" && f.Message.Contains("formBad") && f.Message.Contains("maxCount")
        );
        Assert.Contains(
            report.Findings,
            f => f.RuleId == "DATATYPE-COUNT" && f.Message.Contains("rangeBad") && f.Message.Contains("unsatisfiable")
        );
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "DATATYPE-COUNT" && f.Message.Contains("\"ok\""));
    }

    [Fact]
    public void LayoutSet_NonFormDataType_IsFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/l","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"attach","maxCount":5},{"id":"model","maxCount":1,"minCount":1,"appLogic":{"classRef":"App.M"}}]}""",
                ["App/ui/bad/Settings.json"] = """{"defaultDataType":"attach","pages":{"order":["P"]}}""",
                ["App/ui/bad/layouts/P.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/good/Settings.json"] = """{"defaultDataType":"model","pages":{"order":["P"]}}""",
                ["App/ui/good/layouts/P.json"] = """{"data":{"layout":[]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "LAYOUTSET-FORM-DATATYPE" && f.Message.Contains("attach"));
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "LAYOUTSET-FORM-DATATYPE" && f.Message.Contains("\"model\"")
        );
    }

    [Fact]
    public void SigningPaymentConfig_DataTypeRefs_AreValidated()
    {
        const string bpmn = """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
              <bpmn:process id="proc">
                <bpmn:task id="SigningTask">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>signing</altinn:taskType>
                      <altinn:signatureConfig>
                        <altinn:dataTypesToSign>
                          <altinn:dataType>model</altinn:dataType>
                          <altinn:dataType>missing-sign</altinn:dataType>
                        </altinn:dataTypesToSign>
                        <altinn:signatureDataType>missing-sig</altinn:signatureDataType>
                      </altinn:signatureConfig>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
              </bpmn:process>
            </bpmn:definitions>
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/s","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","maxCount":1,"appLogic":{"classRef":"App.M"}}]}""",
                ["App/config/process/process.bpmn"] = bpmn,
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("missing-sign"));
        Assert.Contains(report.Findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("missing-sig"));
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("\"model\""));
    }

    [Fact]
    public void PdfLayoutName_MustHaveLayoutFile()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/pdf"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"],"pdfLayoutName":"Missing"}}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/Task_1/layouts/PDF.json"] = """{"data":{"layout":[]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("Missing"));
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("\"P1\""));

        var ok = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/pdf"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"],"pdfLayoutName":"PDF"}}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/Task_1/layouts/PDF.json"] = """{"data":{"layout":[]}}""",
            }
        );
        Assert.DoesNotContain(
            ValidationEngine.Run(AppConfigEngine.Open(ok).Build()).Findings,
            f => f.RuleId == "REF-PAGE-FILE"
        );
    }

    [Fact]
    public void PdfLayoutName_FileContent_IsValidated()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/pdf", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"],"pdfLayoutName":"Receipt"}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"ok","type":"Input","dataModelBindings":{"simpleBinding":"project.good"}}]}}""",
                ["App/ui/Task_1/layouts/Receipt.json"] =
                    """{"data":{"layout":[{"id":"bad","type":"Input","dataModelBindings":{"simpleBinding":"project.nope"}}]}}""",
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"good":{"type":"string"}}}}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(
            report.Findings,
            f =>
                f.RuleId == "REF-DATAMODEL-PATH"
                && f.Message.Contains("project.nope")
                && f.Position.File == "App/ui/Task_1/layouts/Receipt.json"
        );
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("project.good")
        );
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "PARSER-COVERAGE-GAP" && f.Message.Contains("Receipt"));
    }

    [Fact]
    public void Summary2_TargetComponent_UnknownId_IsFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s2"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"real","type":"Header"},{"id":"sum","type":"Summary2","target":{"type":"component","id":"nope"}}]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("nope"));
    }

    [Fact]
    public void Summary2_TargetPage_UnknownId_IsFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s2"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"Ghost"}}]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("Ghost"));
    }

    [Fact]
    public void Summary2_OverrideComponentId_UnknownId_IsFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s2"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"layoutSet"},"overrides":[{"componentId":"ghostComp","hidden":true}]}]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("ghostComp"));
    }

    [Fact]
    public void Summary2_ValidOrUnresolvableTargets_AreNotFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s2"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"real","type":"Header"},{"id":"s_comp","type":"Summary2","target":{"type":"component","id":"real"}},{"id":"s_page","type":"Summary2","target":{"type":"page","id":"P1"}},{"id":"s_set","type":"Summary2","target":{"type":"layoutSet"}},{"id":"s_typo","type":"Summary2","target":{"type":"pag","id":"whatever"}},{"id":"s_ov","type":"Summary2","overrides":[{"componentType":"Input","hidden":true}]}]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-LAYOUT-COMPONENT-ID");
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-PAGE-FILE");
    }

    [Fact]
    public void Summary2_CrossTaskTarget_ResolvesAgainstReferencedTaskSet()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s2"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["A1"]}}""",
                ["App/ui/Task_1/layouts/A1.json"] =
                    """{"data":{"layout":[{"id":"okRef","type":"Summary2","target":{"type":"component","id":"known","taskId":"Task_2"}},{"id":"badRef","type":"Summary2","target":{"type":"component","id":"ghost","taskId":"Task_2"}}]}}""",
                ["App/ui/Task_2/Settings.json"] = """{"pages":{"order":["A2"]}}""",
                ["App/ui/Task_2/layouts/A2.json"] = """{"data":{"layout":[{"id":"known","type":"Header"}]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(
            report.Findings,
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("ghost") && f.Message.Contains("Task_2")
        );
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("known")
        );
    }

    [Fact]
    public void Summary2_TargetTaskId_UnknownTask_IsFlagged()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s2"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"x","taskId":"ghostTask"}}]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-TASK-ID" && f.Message.Contains("ghostTask"));
    }

    [Fact]
    public void UnknownTaskType_IsFlaggedAsWarning()
    {
        const string bpmn = """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
              <bpmn:process id="proc">
                <bpmn:task id="GoodTask">
                  <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
                </bpmn:task>
                <bpmn:task id="TypoTask">
                  <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>signign</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
                </bpmn:task>
              </bpmn:process>
            </bpmn:definitions>
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/t"),
                ["App/config/process/process.bpmn"] = bpmn,
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var single = Assert.Single(report.Findings, f => f.RuleId == "PROCESS-TASK-TYPE");
        Assert.True(single.Message.Contains("signign") && single.Severity == Severity.Warning);
    }

    [Fact]
    public void GroupChild_OnDifferentPage_IsFlagged()
    {
        const string p1 = """
            {"data":{"layout":[
              {"id":"g","type":"RepeatingGroup","dataModelBindings":{"group":"items"},"children":["a","b"]},
              {"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"items.a"}}
            ]}}
            """;
        const string p2 =
            """{"data":{"layout":[{"id":"b","type":"Input","dataModelBindings":{"simpleBinding":"items.b"}}]}}""";
        const string model = """
            {"properties":{"items":{"type":"array","items":{"type":"object","properties":{
              "a":{"type":"string"},"b":{"type":"string"}}}}}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/g"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1","P2"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = p1,
                ["App/ui/Task_1/layouts/P2.json"] = p2,
                ["App/models/model.schema.json"] = model,
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var single = Assert.Single(report.Findings, f => f.RuleId == "CROSS-GROUP-CHILD-PAGE");
        Assert.Contains("\"b\"", single.Message);
    }

    [Fact]
    public void SelectionComponent_WithoutOptionsSource_IsFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"dd-ok","type":"Dropdown","optionsId":"x"},
              {"id":"dd-bad","type":"Dropdown"},
              {"id":"in","type":"Input"}
            ]}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var single = Assert.Single(report.Findings, f => f.RuleId == "SELECTION-OPTIONS");
        Assert.Contains("dd-bad", single.Message);
    }

    [Fact]
    public void MetadataTaskId_IsValidatedAgainstProcess()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/t","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"},{"id":"other","taskId":"Task_NOPE"}]}""",
                ["App/config/process/process.bpmn"] =
                    "<definitions><process><task id=\"Task_1\"/></process></definitions>",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-TASK-ID" && f.Message.Contains("Task_NOPE"));
        Assert.DoesNotContain(report.Findings, f => f.RuleId == "REF-TASK-ID" && f.Message.Contains("\"Task_1\""));
    }

    [Fact]
    public void UnusedLayoutFolder_IsWarned_ButReferencedFoldersAreNot()
    {
        const string main = """{"data":{"layout":[{"id":"sf","type":"Subform","layoutSet":"MySubform"}]}}""";
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/uf"),
                ["App/config/process/process.bpmn"] =
                    "<definitions><process><task id=\"Task_1\"/></process></definitions>",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P"]}}""",
                ["App/ui/Task_1/layouts/P.json"] = main,
                ["App/ui/MySubform/Settings.json"] = """{"pages":{"order":["S"]}}""",
                ["App/ui/MySubform/layouts/S.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/CustomReceipt/Settings.json"] = """{"pages":{"order":["R"]}}""",
                ["App/ui/CustomReceipt/layouts/R.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/Leftover/Settings.json"] = """{"pages":{"order":["L"]}}""",
                ["App/ui/Leftover/layouts/L.json"] = """{"data":{"layout":[]}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var single = Assert.Single(report.Findings, f => f.RuleId == "UNUSED-LAYOUT-FOLDER");
        Assert.Contains("\"Leftover\"", single.Message);
    }

    [Fact]
    public void BindingResolvesViaSettingsDefaultDataType()
    {
        const string layout =
            """{"data":{"layout":[{"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"other.field"}}]}}""";
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/b","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"App.M"}},{"id":"other","appLogic":{"classRef":"App.O"}}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"defaultDataType":"model","pages":{"order":["P"]}}""",
                ["App/ui/Task_1/layouts/P.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"model":{"type":"object","properties":{"a":{"type":"string"}}}}}""",
                ["App/models/other.schema.json"] =
                    """{"properties":{"other":{"type":"object","properties":{"field":{"type":"string"}}}}}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(report.Findings, f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("other.field"));
    }

    [Fact]
    public void NestedContainerChildRefs_AreValidated()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"real","type":"Header"},
              {"id":"tabsComp","type":"Tabs","tabs":[{"id":"t1","title":"T","children":["real","ghostTab"]}]},
              {"id":"cardsComp","type":"Cards","cards":[{"children":["real"],"media":"ghostMedia"}]},
              {"id":"gridComp","type":"Grid","rows":[{"cells":[{"component":"real"},{"component":"ghostCell"},{"labelFrom":"ghostLabel"}]}]},
              {"id":"rg","type":"RepeatingGroup","children":["real"],"tableColumns":{"real":{},"ghostCol":{}}},
              {"id":"sum","type":"Summary","componentRef":"real","excludedChildren":["ghostExcluded"]}
            ]}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/n"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var flagged = report.Findings.Where(f => f.RuleId == "REF-LAYOUT-COMPONENT-ID").Select(f => f.Message).ToList();
        foreach (
            var ghost in new[] { "ghostTab", "ghostMedia", "ghostCell", "ghostLabel", "ghostCol", "ghostExcluded" }
        )
            Assert.Contains(flagged, m => m.Contains(ghost));
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("\"real\"")
        );
    }

    [Fact]
    public void OptionTextKeys_DottedKeysValidated_LiteralsIgnored()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rb","type":"RadioButtons","options":[
                {"value":"1","label":"opt.label.ghost"},
                {"value":"2","label":"Alltid"},
                {"value":"3","label":"opt.label.real","description":"opt.desc.ghost"}
              ]},
              {"id":"src","type":"Dropdown","source":{"group":"g","label":"src.label.ghost"}}
            ]}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/o"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/config/texts/resource.nb.json"] =
                    """{"language":"nb","resources":[{"id":"opt.label.real","value":"Real"}]}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var keys = report.Findings.Where(f => f.RuleId == "REF-TEXT-RESOURCE-KEY").Select(f => f.Message).ToList();
        Assert.Contains(keys, m => m.Contains("opt.label.ghost"));
        Assert.Contains(keys, m => m.Contains("opt.desc.ghost"));
        Assert.Contains(keys, m => m.Contains("src.label.ghost"));
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("opt.label.real")
        );
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("Alltid")
        );
    }

    [Fact]
    public void OptionsFile_TextKeys_AreValidated()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/of"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] =
                    """{"data":{"layout":[{"id":"d","type":"Dropdown","optionsId":"countries"}]}}""",
                ["App/options/countries.json"] =
                    """[{"value":"no","label":"countries.norway.ghost"},{"value":"se","label":"Sverige"}]""",
                ["App/config/texts/resource.nb.json"] = """{"language":"nb","resources":[]}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        Assert.Contains(
            report.Findings,
            f =>
                f.RuleId == "REF-TEXT-RESOURCE-KEY"
                && f.Message.Contains("countries.norway.ghost")
                && f.Position.File == "App/options/countries.json"
        );
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("Sverige")
        );
    }

    [Fact]
    public void ContainerTitleKeys_DottedValidated_LiteralsIgnored()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"tabs","type":"Tabs","tabs":[
                {"id":"t1","title":"tabs.title.ghost","children":[]},
                {"id":"t2","title":"Personalia","children":[]},
                {"id":"t3","title":"tabs.title.real","children":[]}
              ]},
              {"id":"cards","type":"Cards","cards":[{"title":"cards.title.ghost","children":[]}]}
            ]}}
            """;
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/ct"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/config/texts/resource.nb.json"] =
                    """{"language":"nb","resources":[{"id":"tabs.title.real","value":"Real"}]}""",
            }
        );

        var report = ValidationEngine.Run(AppConfigEngine.Open(dir).Build());

        var keys = report.Findings.Where(f => f.RuleId == "REF-TEXT-RESOURCE-KEY").Select(f => f.Message).ToList();
        Assert.Contains(keys, m => m.Contains("tabs.title.ghost"));
        Assert.Contains(keys, m => m.Contains("cards.title.ghost"));
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("tabs.title.real")
        );
        Assert.DoesNotContain(
            report.Findings,
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("Personalia")
        );
    }
}
