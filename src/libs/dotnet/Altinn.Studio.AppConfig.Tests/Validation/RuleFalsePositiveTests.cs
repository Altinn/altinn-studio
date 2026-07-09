using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class RuleFalsePositiveTests
{
    private static InMemoryAppDirectory App(string metadata, params (string Path, string Content)[] extra)
    {
        var files = new Dictionary<string, string> { ["App/config/applicationmetadata.json"] = metadata };
        foreach (var (path, content) in extra)
            files[path] = content;
        return new InMemoryAppDirectory(files);
    }

    private static IReadOnlyList<Finding> Validate(IAppDirectory dir) => AppConfigEngine.Open(dir).Validate().Findings;

    [Fact]
    public void DataTypeCount_FormType_OmittingMaxCount_IsNotFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"App.Models.M"}}]}"""
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "DATATYPE-COUNT");
    }

    [Fact]
    public void DataTypeCount_FormType_WithExplicitNonOneMaxCount_IsStillFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"App.Models.M"},"maxCount":2}]}"""
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "DATATYPE-COUNT");
    }

    [Fact]
    public void UniquePageInOrder_PdfLayoutNameReusingOrderedPage_IsNotFlagged()
    {
        var dir = App(
            TestMeta.Json(),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1","P2"],"pdfLayoutName":"P1"}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/ui/Task_1/layouts/P2.json", """{"data":{"layout":[]}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "UNIQUE-PAGE-IN-ORDER");
    }

    [Fact]
    public void UniquePageInOrder_GenuineDuplicateInOrder_IsStillFlagged()
    {
        var dir = App(
            TestMeta.Json(),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1","P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "UNIQUE-PAGE-IN-ORDER");
    }

    [Fact]
    public void RefDataModelPath_BindingToSchemalessDataType_IsNotFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":{"dataType":"sensitive","field":"anything.at.all"}}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/s","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"sensitive","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATAMODEL-PATH");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("sensitive"));
    }

    [Fact]
    public void RefDataModelPath_BindingToSchemaBackedDataType_StillFlagsBadPath()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":{"dataType":"model","field":"nope"}}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/s","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("nope"));
    }

    private const string RecursiveModel = """
        {
          "$defs": {
            "Node": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "children": { "type": "array", "items": { "$ref": "#/$defs/Node" } }
              }
            }
          },
          "type": "object",
          "properties": { "tree": { "$ref": "#/$defs/Node" } }
        }
        """;

    [Fact]
    public void RecursiveModel_NestedBindingPaths_Resolve()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"tree.name"}},
              {"id":"b","type":"Input","dataModelBindings":{"simpleBinding":"tree.children[0].name"}},
              {"id":"c","type":"Input","dataModelBindings":{"simpleBinding":"tree.children[0].children[0].name"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/rec","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", RecursiveModel)
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void RecursiveModel_GenuineBadNestedPath_IsStillFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"b","type":"Input","dataModelBindings":{"simpleBinding":"tree.children[0].nope"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/rec","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", RecursiveModel)
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("nope"));
    }

    [Fact]
    public void RepGroupChild_BindingUnderGroupArray_Resolves()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"people"},"children":["nm"]},
              {"id":"nm","type":"Input","dataModelBindings":{"simpleBinding":"people.name"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/rg","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            (
                "App/models/model.schema.json",
                """{"properties":{"people":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"}}}}}}"""
            )
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void RepGroupChild_BindingToGlobalFieldOutsideGroup_Resolves()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"people"},"children":["sort"]},
              {"id":"sort","type":"Input","dataModelBindings":{"simpleBinding":"sortOrder"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/rg","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            (
                "App/models/model.schema.json",
                """{"properties":{"people":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"}}}},"sortOrder":{"type":"string"}}}"""
            )
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void RepGroupChild_BindingToMissingPath_IsFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"people"},"children":["nm"]},
              {"id":"nm","type":"Input","dataModelBindings":{"simpleBinding":"people.nope"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/rg","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            (
                "App/models/model.schema.json",
                """{"properties":{"people":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"}}}}}}"""
            )
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("people.nope"));
    }

    [Fact]
    public void BindingKind_MultiValueComponent_SimpleBindingToArray_IsNotFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"cb","type":"Checkboxes","dataModelBindings":{"simpleBinding":"chosen"},"optionsId":"x"}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/cb","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"chosen":{"type":"array","items":{"type":"string"}}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "BINDING-KIND");
    }

    [Fact]
    public void BindingKind_SingleValueComponent_SimpleBindingToArray_IsStillFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"chosen"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/in","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"chosen":{"type":"array","items":{"type":"string"}}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "BINDING-KIND");
    }

    [Fact]
    public void NullableTypeArray_GroupBindingAndChildPaths_AreNotFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"people"},"children":["nm"]},
              {"id":"nm","type":"Input","dataModelBindings":{"simpleBinding":"people.name"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/na","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            (
                "App/models/model.schema.json",
                """{"properties":{"people":{"type":["array","null"],"items":{"type":["object","null"],"properties":{"name":{"type":["string","null"]}}}}}}"""
            )
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "BINDING-KIND");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void OneOfWrappedArray_GroupBinding_IsNotFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"people"},"children":["nm"]},
              {"id":"nm","type":"Input","dataModelBindings":{"simpleBinding":"people.name"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/oo","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            (
                "App/models/model.schema.json",
                """{"properties":{"people":{"oneOf":[{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"}}}}]}}}"""
            )
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "BINDING-KIND");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void BindingKind_GroupBindingToScalar_IsStillFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"title"},"children":[]}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/gm","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"title":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "BINDING-KIND" && f.Message.Contains("title"));
    }

    [Fact]
    public void RepGroupChild_MultiPagePrefix_ComponentExists_IsNotFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"people"},"edit":{"multiPage":true},"children":["0:nm","1:age"]},
              {"id":"nm","type":"Input","dataModelBindings":{"simpleBinding":"people.name"}},
              {"id":"age","type":"Input","dataModelBindings":{"simpleBinding":"people.age"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/mp","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            (
                "App/models/model.schema.json",
                """{"properties":{"people":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"string"}}}}}}"""
            )
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-LAYOUT-COMPONENT-ID");
    }

    [Fact]
    public void RepGroupChild_PagePrefixWithoutMultiPage_IsStillFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"rg","type":"RepeatingGroup","dataModelBindings":{"group":"people"},"children":["0:nm"]},
              {"id":"nm","type":"Input","dataModelBindings":{"simpleBinding":"people.name"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/mp","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            (
                "App/models/model.schema.json",
                """{"properties":{"people":{"type":"array","items":{"type":"object","properties":{"name":{"type":"string"}}}}}}"""
            )
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("0:nm"));
    }

    private const string WrappedModel = """
        {
          "properties": { "melding": { "$ref": "#/definitions/Skjema" } },
          "definitions": {
            "Skjema": { "type": "object", "properties": { "name": { "type": "string" } } }
          }
        }
        """;

    private const string WrappedMetadata =
        """{"id":"ttd/w","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"Altinn.App.Models.Skjema"},"taskId":"Task_1"}]}""";

    [Fact]
    public void RefDataModelPath_WrappedGeneratedModel_BindingResolves()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"name"}}
            ]}}
            """;
        var dir = App(
            WrappedMetadata,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", WrappedModel)
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void RefDataModelPath_WrappedGeneratedModel_BadFieldStillFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"nope"}}
            ]}}
            """;
        var dir = App(
            WrappedMetadata,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", WrappedModel)
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("nope"));
    }

    private const string RootModelCs = """
        using System.Text.Json.Serialization;

        namespace Altinn.App.Models;

        public class Root
        {
            [JsonPropertyName("known")]
            public string Known { get; set; }

            [JsonPropertyName("extra")]
            public string Extra { get; set; }
        }
        """;

    [Fact]
    public void RefDataModelPath_PathInCSharpModelButNotSchema_IsNotFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"extra"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/cs","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"Altinn.App.Models.Root"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"known":{"type":"string"}}}"""),
            ("App/models/Root.cs", RootModelCs)
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void RefDataModelPath_PathInNeitherSchemaNorCSharp_IsStillFlagged()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"ghost"}}
            ]}}
            """;
        var dir = App(
            """{"id":"ttd/cs","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"Altinn.App.Models.Root"},"taskId":"Task_1"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"known":{"type":"string"}}}"""),
            ("App/models/Root.cs", RootModelCs)
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("ghost"));
    }

    private const string ExprMeta =
        """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""";

    private static IReadOnlyList<Finding> ValidateExpr(string hiddenExpr, params (string Path, string Content)[] extra)
    {
        var layout =
            """{"data":{"layout":[{"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"x"},"hidden":"""
            + hiddenExpr
            + "}]}}";
        var files = new List<(string, string)>
        {
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}"""),
        };
        files.AddRange(extra);
        return Validate(App(ExprMeta, files.ToArray()));
    }

    [Fact]
    public void Expr_Component_MissingRef_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["equals",["component","ghost"],"y"]"""),
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("ghost")
        );

    [Fact]
    public void Expr_Component_ResolvingRef_IsNotFlagged()
    {
        var layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"x"},"hidden":["equals",["component","other"],"y"]},
              {"id":"other","type":"Input","dataModelBindings":{"simpleBinding":"x"}}
            ]}}
            """;
        var dir = App(
            ExprMeta,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", layout),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-LAYOUT-COMPONENT-ID");
    }

    [Fact]
    public void Expr_DisplayValue_MissingRef_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["equals",["displayValue","ghost"],"y"]"""),
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("ghost")
        );

    [Fact]
    public void Expr_DataModel_MissingPath_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["equals",["dataModel","ghostPath"],"y"]"""),
            f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("ghostPath")
        );

    [Fact]
    public void Expr_DataModel_TwoArg_FieldOnlyInOtherModel_IsFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"other","appLogic":{"classRef":"O"}}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"layout":[{"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"x"},"hidden":["equals",["dataModel","field"],"y"]}]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}"""),
            ("App/models/other.schema.json", """{"properties":{"field":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("field"));
    }

    [Fact]
    public void Expr_DataModel_ThreeArg_RetargetsModel_IsNotFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"other","appLogic":{"classRef":"O"}}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"layout":[{"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"x"},"hidden":["equals",["dataModel","field","other"],"y"]}]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}"""),
            ("App/models/other.schema.json", """{"properties":{"field":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATAMODEL-PATH");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("other"));
    }

    [Fact]
    public void Expr_DataModel_ThreeArg_UnknownDataType_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["equals",["dataModel","x","ghostType"],"y"]"""),
            f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("ghostType")
        );

    [Fact]
    public void Expr_Text_MissingKey_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["equals",["text","ghost.key"],"y"]"""),
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("ghost.key")
        );

    [Fact]
    public void Expr_Text_DeclaredKey_IsNotFlagged() =>
        Assert.DoesNotContain(
            ValidateExpr(
                """["equals",["text","real.key"],"y"]""",
                (
                    "App/config/texts/resource.nb.json",
                    """{"language":"nb","resources":[{"id":"real.key","value":"Real"}]}"""
                )
            ),
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY"
        );

    [Fact]
    public void Expr_OptionLabel_MissingOptionsId_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["equals",["optionLabel","ghostList","v"],"y"]"""),
            f => f.RuleId == "REF-OPTIONS-ID" && f.Message.Contains("ghostList")
        );

    [Fact]
    public void Expr_LinkToComponent_RefIsArg2NotArg1()
    {
        var findings = ValidateExpr("""["linkToComponent","Click here","ghost",true]""");
        Assert.Contains(findings, f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("ghost"));
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("Click here"));
    }

    [Fact]
    public void Expr_LinkToPage_MissingPage_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["linkToPage","Go","ghostPage",true]"""),
            f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("ghostPage")
        );

    [Fact]
    public void Expr_CountDataElements_MissingDataType_IsFlagged() =>
        Assert.Contains(
            ValidateExpr("""["greaterThan",["countDataElements","ghostType"],0]"""),
            f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("ghostType")
        );

    [Fact]
    public void Expr_DynamicComponentArg_IsNotFlagged() =>
        Assert.DoesNotContain(
            ValidateExpr("""["equals",["component",["dataModel","x"]],"y"]"""),
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID"
        );

    [Fact]
    public void Expr_NestedExpressionArg_IsCollected() =>
        Assert.Contains(
            ValidateExpr("""["equals",["optionLabel","someList",["dataModel","ghostPath"]],"y"]"""),
            f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("ghostPath")
        );

    [Fact]
    public void PageHidden_ExpressionMissingComponent_IsFlagged()
    {
        var dir = App(
            ExprMeta,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"hidden":["equals",["component","ghost"],"y"],"layout":[]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("ghost"));
    }

    [Fact]
    public void PageHidden_ExpressionDataModelPath_ResolvesAgainstTaskModel()
    {
        var dir = App(
            ExprMeta,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"hidden":["not",["commaContains",["dataModel","x"],"v"]],"layout":[]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH");
    }

    [Fact]
    public void PageHidden_ExpressionBadDataModelPath_IsFlagged()
    {
        var dir = App(
            ExprMeta,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"hidden":["not",["commaContains",["dataModel","ghostField"],"v"]],"layout":[]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("ghostField"));
    }

    private const string OneTaskBpmn = """
        <?xml version="1.0"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="proc">
            <bpmn:task id="Task_1"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements></bpmn:task>
          </bpmn:process>
        </bpmn:definitions>
        """;

    [Fact]
    public void Settings_PagesExcludeFromPdf_MissingPage_IsFlagged()
    {
        var dir = App(
            ExprMeta,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"],"excludeFromPdf":["ghostPage"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("ghostPage"));
    }

    [Fact]
    public void Settings_PagesExcludeFromPdf_ExistingPage_IsNotFlagged()
    {
        var dir = App(
            ExprMeta,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1","P2"],"excludeFromPdf":["P2"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/ui/Task_1/layouts/P2.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-PAGE-FILE");
    }

    [Fact]
    public void Settings_ComponentsExcludeFromPdf_MissingComponent_IsFlagged()
    {
        var dir = App(
            ExprMeta,
            (
                "App/ui/Task_1/Settings.json",
                """{"pages":{"order":["P1"]},"components":{"excludeFromPdf":["ghostComp"]}}"""
            ),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"layout":[{"id":"realComp","type":"Input","dataModelBindings":{"simpleBinding":"x"}}]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-LAYOUT-COMPONENT-ID" && f.Message.Contains("ghostComp"));
    }

    [Fact]
    public void Settings_ComponentsExcludeFromPdf_ExistingComponent_IsNotFlagged()
    {
        var dir = App(
            ExprMeta,
            (
                "App/ui/Task_1/Settings.json",
                """{"pages":{"order":["P1"]},"components":{"excludeFromPdf":["realComp"]}}"""
            ),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"layout":[{"id":"realComp","type":"Input","dataModelBindings":{"simpleBinding":"x"}}]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-LAYOUT-COMPONENT-ID");
    }

    [Fact]
    public void Settings_GroupName_LiteralNotFlagged_DottedKeyFlagged()
    {
        var dir = App(
            ExprMeta,
            (
                "App/ui/Task_1/Settings.json",
                """{"pages":{"groups":[{"name":"Group1","order":["P1"]},{"name":"group.title","order":["P2"]}]}}"""
            ),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/ui/Task_1/layouts/P2.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("Group1"));
        Assert.Contains(findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("group.title"));
    }

    [Fact]
    public void GlobalSettings_TaskNavigation_MissingTask_IsFlagged()
    {
        var dir = App(
            ExprMeta,
            ("App/config/process/process.bpmn", OneTaskBpmn),
            ("App/ui/Settings.json", """{"taskNavigation":[{"taskId":"GhostTask","name":"x"}]}"""),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-TASK-ID" && f.Message.Contains("GhostTask"));
    }

    [Fact]
    public void GlobalSettings_TaskNavigation_ValidTaskAndLiteralName_IsNotFlagged()
    {
        var dir = App(
            ExprMeta,
            ("App/config/process/process.bpmn", OneTaskBpmn),
            (
                "App/ui/Settings.json",
                """{"taskNavigation":[{"taskId":"Task_1","name":"Utfylling 1"},{"type":"receipt"}]}"""
            ),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-TASK-ID");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("Utfylling"));
    }

    [Fact]
    public void GlobalSettings_TaskNavigationName_DottedKey_IsFlagged()
    {
        var dir = App(
            ExprMeta,
            ("App/config/process/process.bpmn", OneTaskBpmn),
            ("App/ui/Settings.json", """{"taskNavigation":[{"taskId":"Task_1","name":"tasks.form"}]}"""),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("tasks.form"));
    }

    [Fact]
    public void Footer_TitleDottedKey_IsFlagged_TargetLiteralIsNot()
    {
        var dir = App(
            ExprMeta,
            (
                "App/ui/footer.json",
                """{"footer":[{"type":"Link","title":"footer.privacy","target":"https://altinn.no/privacy"}]}"""
            ),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.Contains(findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("footer.privacy"));
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("altinn.no"));
    }

    [Fact]
    public void Footer_DeclaredKeyAndLiteralTitle_AreNotFlagged()
    {
        var dir = App(
            ExprMeta,
            (
                "App/ui/footer.json",
                """{"footer":[{"type":"Link","title":"footer.privacy","target":"https://x.no"},{"type":"Text","title":"Kontakt oss"}]}"""
            ),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            (
                "App/config/texts/resource.nb.json",
                """{"language":"nb","resources":[{"id":"footer.privacy","value":"Personvern"}]}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-TEXT-RESOURCE-KEY");
    }

    [Fact]
    public void Footer_EmailAndPhoneTitles_AreNotFlagged()
    {
        var dir = App(
            ExprMeta,
            (
                "App/ui/footer.json",
                """{"footer":[{"type":"Email","title":"hjelp@etaten.no","target":"hjelp@etaten.no"},{"type":"Phone","title":"+4798765432","target":"+4798765432"}]}"""
            ),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-TEXT-RESOURCE-KEY");
    }

    [Fact]
    public void Footer_BuiltInTextKey_IsNotFlagged()
    {
        var dir = App(
            ExprMeta,
            (
                "App/ui/footer.json",
                """{"footer":[{"type":"Link","title":"general.accessibility","target":"general.accessibility_url"}]}"""
            ),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.DoesNotContain(Validate(dir), f => f.RuleId == "REF-TEXT-RESOURCE-KEY");
    }

    [Fact]
    public void ComponentTextBinding_BuiltInKeyResolves_TypoStillFlags()
    {
        var dir = App(
            ExprMeta,
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            (
                "App/ui/Task_1/layouts/P1.json",
                """{"data":{"layout":[{"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"x"},"textResourceBindings":{"title":"general.back","help":"not.a.builtin.key"}}]}}"""
            ),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("general.back"));
        Assert.Contains(findings, f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("not.a.builtin.key"));
    }

    private const string V8Csproj = """
        <Project Sdk="Microsoft.NET.Sdk.Web">
          <ItemGroup>
            <PackageReference Include="Altinn.App.Api" Version="8.12.0">
              <CopyToOutputDirectory>lib\$(TargetFramework)\*.xml</CopyToOutputDirectory>
            </PackageReference>
            <PackageReference Include="Altinn.App.Core" Version="8.12.0" />
          </ItemGroup>
        </Project>
        """;

    private static (string Path, string Content)[] BrokenAppFiles(string csproj) =>
        new[]
        {
            ("App/App.csproj", csproj),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1","GhostPage"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}"""),
        };

    [Fact]
    public void AppVersion_V8Package_StopsWithTheSingleVersionError()
    {
        var findings = Validate(App(ExprMeta, BrokenAppFiles(V8Csproj)));

        var f = Assert.Single(findings);
        Assert.Equal("APP-VERSION-SUPPORTED", f.RuleId);
        Assert.Equal(Severity.Error, f.Severity);
        Assert.Contains("Altinn.App.Api 8.12.0", f.Message);
        Assert.Equal("App/App.csproj", f.Position.File);
        Assert.DoesNotContain(findings, x => x.RuleId == "REF-PAGE-FILE");
    }

    [Fact]
    public void AppVersion_V9Package_ValidatesNormally()
    {
        var findings = Validate(App(ExprMeta, BrokenAppFiles(V8Csproj.Replace("8.12.0", "9.1.0"))));
        Assert.DoesNotContain(findings, f => f.RuleId == "APP-VERSION-SUPPORTED");
        Assert.Contains(findings, f => f.RuleId == "REF-PAGE-FILE" && f.Message.Contains("GhostPage"));
    }

    [Fact]
    public void AppVersion_SourceBuildAndResolvableIndirections_Pass()
    {
        Assert.DoesNotContain(
            Validate(App(ExprMeta, BrokenAppFiles(V8Csproj.Replace("8.12.0", "9.0.0-preview.5")))),
            f => f.RuleId == "APP-VERSION-SUPPORTED"
        );

        const string projectRef = """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <ProjectReference Include="../../src/Altinn.App.Api/Altinn.App.Api.csproj" />
              </ItemGroup>
            </Project>
            """;
        Assert.DoesNotContain(
            Validate(App(ExprMeta, BrokenAppFiles(projectRef))),
            f => f.RuleId == "APP-VERSION-SUPPORTED"
        );

        const string importedProjectRefCsproj = """<Project Sdk="Microsoft.NET.Sdk.Web" />""";
        var importedProjectRefFiles = BrokenAppFiles(importedProjectRefCsproj)
            .Append(
                (
                    "Directory.Build.props",
                    """
                    <Project>
                      <ItemGroup>
                        <ProjectReference Include="../../App/backend/src/Altinn.App.Api/Altinn.App.Api.csproj" />
                      </ItemGroup>
                    </Project>
                    """
                )
            )
            .ToArray();
        Assert.DoesNotContain(
            Validate(App(ExprMeta, importedProjectRefFiles)),
            f => f.RuleId == "APP-VERSION-SUPPORTED"
        );

        const string propCsproj = """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup><AltinnAppVersion>9.1.0</AltinnAppVersion></PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="$(AltinnAppVersion)" />
              </ItemGroup>
            </Project>
            """;
        Assert.DoesNotContain(
            Validate(App(ExprMeta, BrokenAppFiles(propCsproj))),
            f => f.RuleId == "APP-VERSION-SUPPORTED"
        );

        const string cpmCsproj = """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup><PackageReference Include="Altinn.App.Api" /></ItemGroup>
            </Project>
            """;
        var files = BrokenAppFiles(cpmCsproj)
            .Append(
                (
                    "Directory.Packages.props",
                    """<Project><ItemGroup><PackageVersion Include="Altinn.App.Api" Version="9.2.0" /></ItemGroup></Project>"""
                )
            )
            .ToArray();
        Assert.DoesNotContain(Validate(App(ExprMeta, files)), f => f.RuleId == "APP-VERSION-SUPPORTED");

        var repoRoot = Path.Combine(Path.GetTempPath(), "appconfig-cpm-" + Guid.NewGuid().ToString("N"));
        try
        {
            var appRoot = Path.Combine(repoRoot, "apps", "my-app");
            Directory.CreateDirectory(Path.Combine(appRoot, "App", "config"));
            Directory.CreateDirectory(Path.Combine(appRoot, "App", "ui", "Task_1", "layouts"));
            Directory.CreateDirectory(Path.Combine(appRoot, "App", "models"));
            File.WriteAllText(
                Path.Combine(repoRoot, "Directory.Packages.props"),
                """<Project><ItemGroup><PackageVersion Include="Altinn.App.Api" Version="9.2.0" /></ItemGroup></Project>"""
            );
            foreach (var (path, content) in BrokenAppFiles(cpmCsproj))
            {
                var fullPath = Path.Combine(appRoot, path.Replace('/', Path.DirectorySeparatorChar));
                Directory.CreateDirectory(
                    Path.GetDirectoryName(fullPath)
                        ?? throw new InvalidOperationException($"missing parent for {fullPath}")
                );
                File.WriteAllText(fullPath, content);
            }
            File.WriteAllText(Path.Combine(appRoot, "App", "config", "applicationmetadata.json"), ExprMeta);

            var engine = AppConfigEngine.Open(appRoot);
            Assert.DoesNotContain(engine.Validate().Findings, f => f.RuleId == "APP-VERSION-SUPPORTED");

            // Editing the parent import must invalidate the cached version fragment.
            File.WriteAllText(
                Path.Combine(repoRoot, "Directory.Packages.props"),
                """<Project><ItemGroup><PackageVersion Include="Altinn.App.Api" Version="8.12.0" /></ItemGroup></Project>"""
            );
            Assert.Contains(engine.Validate().Findings, f => f.RuleId == "APP-VERSION-SUPPORTED");
        }
        finally
        {
            if (Directory.Exists(repoRoot))
                Directory.Delete(repoRoot, recursive: true);
        }

        Assert.DoesNotContain(
            Validate(App(ExprMeta, BrokenAppFiles(V8Csproj).Where(f => f.Path != "App/App.csproj").ToArray())),
            f => f.RuleId == "APP-VERSION-SUPPORTED"
        );
    }

    [Fact]
    public void AppVersion_UndeterminableVersion_FailsLoudly()
    {
        var undefined = Validate(App(ExprMeta, BrokenAppFiles(V8Csproj.Replace("8.12.0", "$(SomewhereElse)"))));
        var f = Assert.Single(undefined);
        Assert.Equal("APP-VERSION-SUPPORTED", f.RuleId);
        Assert.Contains("could not determine", f.Message);

        const string cpmCsproj = """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup><PackageReference Include="Altinn.App.Core" /></ItemGroup>
            </Project>
            """;
        var files = BrokenAppFiles(cpmCsproj)
            .Append(
                (
                    "Directory.Packages.props",
                    """<Project><ItemGroup><PackageVersion Include="Altinn.App.Core" Version="8.5.0" /></ItemGroup></Project>"""
                )
            )
            .ToArray();
        var coreFinding = Assert.Single(Validate(App(ExprMeta, files)));
        Assert.Contains("Altinn.App.Core 8.5.0", coreFinding.Message);

        const string noRef = """<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup /></Project>""";
        var noRefFinding = Assert.Single(Validate(App(ExprMeta, BrokenAppFiles(noRef))));
        Assert.Contains("no Altinn.App package or project reference", noRefFinding.Message);
    }

    [Fact]
    public void AppVersion_UpgradingTheCsproj_Unblocks()
    {
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = ExprMeta,
                ["App/App.csproj"] = V8Csproj,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1","GhostPage"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
                ["App/models/model.schema.json"] = """{"properties":{"x":{"type":"string"}}}""",
            }
        );
        var engine = AppConfigEngine.Open(dir);

        Assert.Single(engine.Validate().Findings, f => f.RuleId == "APP-VERSION-SUPPORTED");

        dir.Set("App/App.csproj", V8Csproj.Replace("8.12.0", "9.1.0"));
        var after = engine.Validate().Findings;
        Assert.DoesNotContain(after, f => f.RuleId == "APP-VERSION-SUPPORTED");
        Assert.Contains(after, f => f.RuleId == "REF-PAGE-FILE");
    }

    private const string ExprBpmn = """
        <?xml version="1.0"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="proc">
            <bpmn:task id="Task_1"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements></bpmn:task>
            <bpmn:sequenceFlow id="Flow_1" sourceRef="Task_1" targetRef="End">
              <bpmn:conditionExpression>EXPR</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
          </bpmn:process>
        </bpmn:definitions>
        """;

    private static IReadOnlyList<Finding> ValidateBpmnExpr(string expr) =>
        Validate(
            App(
                ExprMeta,
                ("App/config/process/process.bpmn", ExprBpmn.Replace("EXPR", expr)),
                ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
                ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
                ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
            )
        );

    [Fact]
    public void Bpmn_ConditionExpression_ValidRefs_AreNotFlagged()
    {
        var findings = ValidateBpmnExpr("""["equals",["dataModel","x","model"],true]""");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATAMODEL-PATH");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATATYPE-ID");
    }

    [Fact]
    public void Bpmn_ConditionExpression_BadPath_IsFlaggedAtItsToken()
    {
        var bpmn = ExprBpmn.Replace("EXPR", """["equals",["dataModel","ghostPath","model"],true]""");
        var findings = ValidateBpmnExpr("""["equals",["dataModel","ghostPath","model"],true]""");
        var f = Assert.Single(findings, x => x.RuleId == "REF-DATAMODEL-PATH");
        Assert.Contains("ghostPath", f.Message);
        Assert.Equal("App/config/process/process.bpmn", f.Position.File);
        var lines = bpmn.Split('\n');
        var line = Array.FindIndex(lines, l => l.Contains("\"ghostPath\"")) + 1;
        Assert.Equal(line, f.Position.Line);
        Assert.Equal(lines[line - 1].IndexOf("\"ghostPath\"", StringComparison.Ordinal) + 1, f.Position.Column);
    }

    [Fact]
    public void Bpmn_ConditionExpression_UnknownDataTypeArg_IsFlagged() =>
        Assert.Contains(
            ValidateBpmnExpr("""["equals",["dataModel","x","ghostType"],true]"""),
            f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("ghostType")
        );

    [Fact]
    public void Bpmn_ConditionExpression_TwoArgDataModel_ChecksAgainstUnion()
    {
        Assert.DoesNotContain(
            ValidateBpmnExpr("""["equals",["dataModel","x"],true]"""),
            f => f.RuleId == "REF-DATAMODEL-PATH"
        );
        Assert.Contains(
            ValidateBpmnExpr("""["equals",["dataModel","inNoModelAtAll"],true]"""),
            f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("inNoModelAtAll")
        );
    }

    [Fact]
    public void Bpmn_ConditionExpression_MalformedJson_IsSyntaxFlagged() =>
        Assert.Contains(
            ValidateBpmnExpr("not valid json at all"),
            f => f.RuleId == "SYNTAX-VALID" && f.Message.Contains("conditionExpression")
        );

    [Fact]
    public void Bpmn_ConditionExpression_FrontendOnlyFunction_IsNotCollected() =>
        Assert.DoesNotContain(
            ValidateBpmnExpr("""["equals",["displayValue","ghostComponent"],true]"""),
            f => f.RuleId == "REF-LAYOUT-COMPONENT-ID"
        );

    [Fact]
    public void Metadata_PresentationField_ValidPathAndType_IsNotFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}],"presentationFields":[{"id":"f","path":"a.b","dataTypeId":"model"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            (
                "App/models/model.schema.json",
                """{"properties":{"a":{"type":"object","properties":{"b":{"type":"string"}}}}}"""
            )
        );
        var findings = Validate(dir);
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATAMODEL-PATH");
        Assert.DoesNotContain(findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("model"));
    }

    [Fact]
    public void Metadata_PresentationField_BadPath_IsFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}],"presentationFields":[{"id":"f","path":"a.ghost","dataTypeId":"model"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            (
                "App/models/model.schema.json",
                """{"properties":{"a":{"type":"object","properties":{"b":{"type":"string"}}}}}"""
            )
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATAMODEL-PATH" && f.Message.Contains("a.ghost"));
    }

    [Fact]
    public void Metadata_DataField_UnknownDataType_IsFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}],"dataFields":[{"id":"f","path":"a","dataTypeId":"ghostType"}]}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"a":{"type":"string"}}}""")
        );
        Assert.Contains(Validate(dir), f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("ghostType"));
    }

    [Fact]
    public void Metadata_EFormidling_UnknownTaskAndDataType_IsFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}],"eFormidling":{"sendAfterTaskId":"GhostTask","dataTypes":["ghostType"]}}""",
            ("App/config/process/process.bpmn", OneTaskBpmn),
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.Contains(findings, f => f.RuleId == "REF-TASK-ID" && f.Message.Contains("GhostTask"));
        Assert.Contains(findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("ghostType"));
    }

    [Fact]
    public void Metadata_CopyInstanceAndShadowFields_UnknownDataType_IsFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M","shadowFields":{"saveToDataType":"ghostShadow"}},"taskId":"Task_1"}],"copyInstanceSettings":{"enabled":true,"excludedDataTypes":["ghostExcluded"]}}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        var findings = Validate(dir);
        Assert.Contains(findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("ghostShadow"));
        Assert.Contains(findings, f => f.RuleId == "REF-DATATYPE-ID" && f.Message.Contains("ghostExcluded"));
    }

    [Fact]
    public void Metadata_ApiScopesErrorMessageKey_Undeclared_IsFlagged()
    {
        var dir = App(
            """{"id":"ttd/x","org":"ttd","title":{"nb":"X"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}],"apiScopes":{"errorMessageTextResourceKey":"scope.error.key"}}""",
            ("App/ui/Task_1/Settings.json", """{"pages":{"order":["P1"]}}"""),
            ("App/ui/Task_1/layouts/P1.json", """{"data":{"layout":[]}}"""),
            ("App/models/model.schema.json", """{"properties":{"x":{"type":"string"}}}""")
        );
        Assert.Contains(
            Validate(dir),
            f => f.RuleId == "REF-TEXT-RESOURCE-KEY" && f.Message.Contains("scope.error.key")
        );
    }
}
