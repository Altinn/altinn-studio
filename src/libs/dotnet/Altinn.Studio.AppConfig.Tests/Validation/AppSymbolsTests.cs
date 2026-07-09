using System.Text;
using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Validation;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class AppSymbolsTests
{
    private const string NavLayout = """
        {
          "data": {
            "layout": [
              {
                "id": "field-a",
                "type": "Input",
                "dataModelBindings": { "simpleBinding": "project.x" },
                "textResourceBindings": { "title": "key.a" }
              },
              {
                "id": "group",
                "type": "RepeatingGroup",
                "dataModelBindings": { "group": "items" },
                "children": ["field-a"]
              }
            ]
          }
        }
        """;
    private const string NavResource = """{ "language": "nb", "resources": [ { "id": "key.a", "value": "A" } ] }""";

    private static MutableAppDirectory NavApp() =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/nav", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = NavLayout,
                ["App/config/texts/resource.nb.json"] = NavResource,
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"x":{"type":"string"}}}}}""",
            }
        );

    private static (int Line, int Col) At(string text, string token, int nth)
    {
        var idx = -1;
        for (var k = 0; k < nth; k++)
            idx = text.IndexOf(token, idx + 1, StringComparison.Ordinal);
        var inside = idx + 1;
        int line = 1,
            col = 1;
        for (var p = 0; p < inside; p++)
        {
            if (text[p] == '\n')
            {
                line++;
                col = 1;
            }
            else
                col++;
        }
        return (line, col);
    }

    private static AppSymbols OpenSymbols(MutableAppDirectory dir)
    {
        var engine = AppConfigEngine.Open(dir);
        engine.Build();
        return new AppSymbols(engine);
    }

    [Fact]
    public void Definition_ResolvesComponentAndTextKey()
    {
        var symbols = OpenSymbols(NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (cl, cc) = At(NavLayout, "\"field-a\"", 2);
        var compDef = symbols.Definition(p1, cl, cc);
        Assert.Single(compDef);
        Assert.Equal(p1, compDef[0].File);
        Assert.Equal("/data/layout/0", compDef[0].Pointer);

        var (tl, tc) = At(NavLayout, "\"key.a\"", 1);
        var keyDef = symbols.Definition(p1, tl, tc);
        Assert.Single(keyDef);
        Assert.Equal("App/config/texts/resource.nb.json", keyDef[0].File);
        Assert.Equal("/resources/0/id", keyDef[0].Pointer);

        var (pl, pc) = At(NavLayout, ".x\"", 1);
        var pathDef = symbols.Definition(p1, pl, pc);
        Assert.Single(pathDef);
        Assert.Equal("App/models/model.schema.json", pathDef[0].File);
        Assert.Equal("/properties/project/properties/x", pathDef[0].Pointer);
    }

    [Fact]
    public void References_FindsComponentUses()
    {
        var symbols = OpenSymbols(NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(NavLayout, "\"field-a\"", 1);
        var refs = symbols.References(p1, l, c, includeDeclaration: false);
        Assert.Single(refs);
        Assert.Equal("/data/layout/1/children/0", refs[0].Pointer);

        Assert.Equal(2, symbols.References(p1, l, c, includeDeclaration: true).Count);
    }

    private const string Summary2NavLayout = """
        {
          "data": {
            "layout": [
              { "id": "target-comp", "type": "Header" },
              { "id": "the-summary", "type": "Summary2", "target": { "type": "component", "id": "target-comp" }, "overrides": [ { "componentId": "target-comp", "hidden": true } ] },
              { "id": "page-summary", "type": "Summary2", "target": { "type": "page", "id": "P2" } }
            ]
          }
        }
        """;

    private static MutableAppDirectory Summary2NavApp() =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s2nav"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1","P2"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = Summary2NavLayout,
                ["App/ui/Task_1/layouts/P2.json"] = """{"data":{"layout":[]}}""",
            }
        );

    [Fact]
    public void Definition_ResolvesSummary2TargetComponentAndOverride()
    {
        var symbols = OpenSymbols(Summary2NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (tl, tc) = At(Summary2NavLayout, "\"target-comp\"", 2);
        var targetDef = symbols.Definition(p1, tl, tc);
        Assert.Single(targetDef);
        Assert.Equal(p1, targetDef[0].File);
        Assert.Equal("/data/layout/0", targetDef[0].Pointer);

        var (ol, oc) = At(Summary2NavLayout, "\"target-comp\"", 3);
        var overrideDef = Assert.Single(symbols.Definition(p1, ol, oc));
        Assert.Equal("/data/layout/0", overrideDef.Pointer);
    }

    [Fact]
    public void Definition_ResolvesSummary2TargetPage()
    {
        var symbols = OpenSymbols(Summary2NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(Summary2NavLayout, "\"P2\"", 1);
        var def = symbols.Definition(p1, l, c);
        Assert.Single(def);
        Assert.Equal("App/ui/Task_1/layouts/P2.json", def[0].File);
    }

    [Fact]
    public void References_FindsSummary2ComponentUses()
    {
        var symbols = OpenSymbols(Summary2NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(Summary2NavLayout, "\"target-comp\"", 1);
        var refs = symbols.References(p1, l, c, includeDeclaration: false);
        Assert.Equal(_summary2ComponentRefPointers.OrderBy(s => s), refs.Select(r => r.Pointer).OrderBy(s => s));
    }

    [Fact]
    public void References_FindsSummary2PageUses()
    {
        var symbols = OpenSymbols(Summary2NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(Summary2NavLayout, "\"P2\"", 1);
        var refs = symbols.References(p1, l, c, includeDeclaration: false);
        Assert.Contains(refs, r => r.File == p1 && r.Pointer == "/data/layout/2/target/id");
        Assert.Contains(refs, r => r.File == "App/ui/Task_1/Settings.json" && r.Pointer == "/pages/order/1");
    }

    [Fact]
    public void ProposeRename_RewritesSummary2ComponentRefs()
    {
        var symbols = OpenSymbols(Summary2NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(Summary2NavLayout, "\"target-comp\"", 1);
        var edits = symbols.ProposeRename(p1, l, c, "renamed").Cast<ReplaceEdit>().ToList();
        Assert.Equal(
            _summary2ComponentRenamePointers.OrderBy(s => s),
            edits.Select(e => e.Span.Pointer).OrderBy(s => s)
        );
        Assert.All(edits, e => Assert.True(e.NewValue == "\"renamed\""));
        Assert.All(edits, e => Assert.True(e.OldValue == "\"target-comp\""));
    }

    [Fact]
    public void SuggestCorrection_OffersClosestForSummary2TargetComponent()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"target-comp","type":"Header"},
              {"id":"sum","type":"Summary2","target":{"type":"component","id":"target-komp"}}
            ]}}
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
            }
        );
        var symbols = OpenSymbols(dir);

        var (cl, cc) = At(layout, "\"target-komp\"", 1);
        Assert.Equal("target-comp", symbols.SuggestCorrection("App/ui/Task_1/layouts/P1.json", cl, cc));
    }

    [Fact]
    public void Completions_SuggestComponentIds_ForChildrenAndSummary2()
    {
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var children = OpenSymbols(NavApp());
        var (chl, chc) = At(NavLayout, "\"field-a\"", 2);
        Assert.Contains(
            children.Completions(p1, chl, chc),
            s => s.Label == "field-a" && s.Kind == SuggestionKind.Component
        );

        var s2 = OpenSymbols(Summary2NavApp());
        var (tl, tc) = At(Summary2NavLayout, "\"target-comp\"", 2);
        Assert.Contains(
            s2.Completions(p1, tl, tc),
            s => s.Label == "target-comp" && s.Kind == SuggestionKind.Component
        );
        var (ol, oc) = At(Summary2NavLayout, "\"target-comp\"", 3);
        Assert.Contains(
            s2.Completions(p1, ol, oc),
            s => s.Label == "target-comp" && s.Kind == SuggestionKind.Component
        );
    }

    [Fact]
    public void Completions_SuggestPageNames_ForSummary2TargetPage()
    {
        var symbols = OpenSymbols(Summary2NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(Summary2NavLayout, "\"P2\"", 1);
        var pages = symbols.Completions(p1, l, c);
        Assert.Contains(pages, s => s.Label == "P2" && s.Kind == SuggestionKind.Page);
        Assert.Contains(pages, s => s.Label == "P1" && s.Kind == SuggestionKind.Page);
    }

    [Fact]
    public void Completions_SuggestTaskIds_ForSummary2TargetTaskId()
    {
        const string bpmn = """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
              <bpmn:process id="proc">
                <bpmn:task id="Task_Data">
                  <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
                </bpmn:task>
              </bpmn:process>
            </bpmn:definitions>
            """;
        const string layout =
            """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"P1","taskId":"Task_D"}}]}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s"),
                ["App/config/process/process.bpmn"] = bpmn,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
            }
        );
        var symbols = OpenSymbols(dir);

        var (l, c) = At(layout, "\"Task_D\"", 1);
        Assert.Contains(
            symbols.Completions("App/ui/Task_1/layouts/P1.json", l, c),
            s => s.Label == "Task_Data" && s.Kind == SuggestionKind.Task
        );
    }

    private const string TaskBpmn = """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
          <bpmn:process id="proc">
            <bpmn:task id="Task_A">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>data</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:task id="Task_B">
              <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>confirmation</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
            </bpmn:task>
            <bpmn:sequenceFlow id="flow1" sourceRef="Task_A" targetRef="Task_B" />
          </bpmn:process>
        </bpmn:definitions>
        """;
    private const string TaskNavLayout =
        """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"P1","taskId":"Task_A"}}]}}""";

    private static MutableAppDirectory TaskNavApp() =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/tn","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_A"}]}""",
                ["App/config/process/process.bpmn"] = TaskBpmn,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = TaskNavLayout,
            }
        );

    [Fact]
    public void Definition_ResolvesTaskToProcessBpmn()
    {
        var symbols = OpenSymbols(TaskNavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(TaskNavLayout, "\"Task_A\"", 1);
        var def = symbols.Definition(p1, l, c);
        Assert.Single(def);
        Assert.Equal("App/config/process/process.bpmn", def[0].File);
        Assert.True(def[0].Line > 0);
    }

    [Fact]
    public void References_FindsTaskUsesAcrossConfig()
    {
        var symbols = OpenSymbols(TaskNavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(TaskNavLayout, "\"Task_A\"", 1);
        var refs = symbols.References(p1, l, c, includeDeclaration: false);
        Assert.Contains(refs, r => r.File == p1 && r.Pointer == "/data/layout/0/target/taskId");
        Assert.Contains(refs, r => r.File == "App/config/applicationmetadata.json");
    }

    [Fact]
    public void ProposeRename_RewritesTaskAcrossBpmnAndConfig()
    {
        var symbols = OpenSymbols(TaskNavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(TaskNavLayout, "\"Task_A\"", 1);
        var edits = symbols.ProposeRename(p1, l, c, "Task_Renamed").Cast<ReplaceEdit>().ToList();

        Assert.All(edits, e => Assert.True(e.NewValue == "\"Task_Renamed\"" && e.OldValue == "\"Task_A\""));
        Assert.Equal(2, edits.Count(e => e.Span.File == "App/config/process/process.bpmn"));
        Assert.Contains(edits, e => e.Span.File == p1 && e.Span.Pointer == "/data/layout/0/target/taskId");
    }

    [Fact]
    public void SuggestCorrection_OffersClosestForTaskId()
    {
        const string layout =
            """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"P1","taskId":"TaskA"}}]}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/tn"),
                ["App/config/process/process.bpmn"] = TaskBpmn,
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
            }
        );
        var symbols = OpenSymbols(dir);

        var (l, c) = At(layout, "\"TaskA\"", 1);
        Assert.Equal("Task_A", symbols.SuggestCorrection("App/ui/Task_1/layouts/P1.json", l, c));
    }

    [Fact]
    public void Completions_SuggestDataModelPathsAndTextKeys()
    {
        var symbols = OpenSymbols(NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (dl, dc) = At(NavLayout, "\"project.x\"", 1);
        Assert.Contains(
            symbols.Completions(p1, dl, dc),
            s => s.Label == "project.x" && s.Kind == SuggestionKind.DataModelPath
        );

        var (tl, tc) = At(NavLayout, "\"key.a\"", 1);
        Assert.Contains(symbols.Completions(p1, tl, tc), s => s.Label == "key.a" && s.Kind == SuggestionKind.TextKey);
    }

    [Fact]
    public void Completions_AreScopedToTheBindingsDataType()
    {
        const string layout =
            """{"data":{"layout":[{"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"project.x"}}]}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/s","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"other","appLogic":{"classRef":"O"},"taskId":"Other"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"x":{"type":"string"}}}}}""",
                ["App/models/other.schema.json"] =
                    """{"properties":{"unrelated":{"type":"object","properties":{"y":{"type":"string"}}}}}""",
            }
        );
        var symbols = OpenSymbols(dir);
        var (l, c) = At(layout, "\"project.x\"", 1);
        var comp = symbols.Completions("App/ui/Task_1/layouts/P1.json", l, c);

        Assert.Contains(comp, s => s.Label == "project.x" && s.Kind == SuggestionKind.DataModelPath);
        Assert.DoesNotContain(comp, s => s.Label == "unrelated.y");
    }

    [Fact]
    public void ProposeRename_CoverComponentAndDataPath()
    {
        var symbols = OpenSymbols(NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (cl, cc) = At(NavLayout, "\"field-a\"", 1);
        var comp = symbols.ProposeRename(p1, cl, cc, "renamed").Cast<ReplaceEdit>().ToList();
        Assert.Equal(_componentRenamePointers.OrderBy(s => s), comp.Select(e => e.Span.Pointer).OrderBy(s => s));
        Assert.All(comp, e => Assert.True(e.NewValue == "\"renamed\""));
        Assert.All(comp, e => Assert.True(e.OldValue == "\"field-a\""));

        var (xl, xc) = At(NavLayout, ".x\"", 1);
        var leaf = symbols.ProposeRename(p1, xl, xc, "y").Cast<ReplaceEdit>().ToList();
        Assert.Contains(leaf, e => e.Span.File == "App/models/model.schema.json" && e.NewValue == "\"y\"");
        Assert.Contains(leaf, e => e.Span.File == p1 && e.NewValue == "\"project.y\"");

        var (nl, nc) = At(NavLayout, "\"project.x\"", 1);
        var node = symbols.ProposeRename(p1, nl, nc, "proj").Cast<ReplaceEdit>().ToList();
        Assert.Contains(node, e => e.Span.File == "App/models/model.schema.json" && e.NewValue == "\"proj\"");
        Assert.Contains(node, e => e.Span.File == p1 && e.NewValue == "\"proj.x\"");
    }

    [Fact]
    public void Completions_DataTypeSlotSuggestsDeclaredDataTypes()
    {
        const string layout = """
            { "data": { "layout": [
                { "id": "a", "type": "Input",
                  "dataModelBindings": { "simpleBinding": { "dataType": "model", "field": "project.x" } } }
            ] } }
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/dt", "model", "attachment"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"x":{"type":"string"}}}}}""",
            }
        );
        var symbols = OpenSymbols(dir);
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (dl, dc) = At(layout, "\"model\"", 1);
        var dataTypes = symbols.Completions(p1, dl, dc);
        Assert.Equal(_declaredDataTypes.OrderBy(s => s), dataTypes.Select(s => s.Label).OrderBy(s => s));
        Assert.All(dataTypes, s => Assert.True(s.Kind == SuggestionKind.DataType));

        var (fl, fc) = At(layout, "\"project.x\"", 1);
        Assert.Contains(
            symbols.Completions(p1, fl, fc),
            s => s.Kind == SuggestionKind.DataModelPath && s.Label == "project.x"
        );
    }

    [Fact]
    public void Options_DefinitionAndReferences()
    {
        const string layout =
            """{ "data": { "layout": [ { "id": "dd", "type": "Dropdown", "optionsId": "utils" } ] } }""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/o"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/options/utils.json"] = "[]",
            }
        );
        var symbols = OpenSymbols(dir);
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l, c) = At(layout, "\"utils\"", 1);
        var def = symbols.Definition(p1, l, c);
        Assert.Single(def);
        Assert.Equal("App/options/utils.json", def[0].File);

        Assert.Single(symbols.References(p1, l, c, includeDeclaration: false));
        Assert.Single(symbols.References("App/options/utils.json", 1, 1, includeDeclaration: false));
    }

    [Fact]
    public void Definition_NestedSchemaPath_LandsAtDefsDeclaration()
    {
        const string model = """
            {
              "type": "object",
              "properties": {
                "reportedData": { "$ref": "#/$defs/ReportedData" }
              },
              "$defs": {
                "ReportedData": {
                  "type": "object",
                  "properties": { "request": { "$ref": "#/$defs/Request" } }
                },
                "Request": { "type": "object", "properties": { "trademarkType": { "type": "string" } } }
              }
            }
            """;
        const string layout = """
            {"data":{"layout":[
              {"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"reportedData.request.trademarkType"}}
            ]}}
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/r", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] = model,
            }
        );
        var symbols = OpenSymbols(dir);

        const string p1 = "App/ui/Task_1/layouts/P1.json";
        var (l, c) = At(layout, "trademarkType\"", 1);
        var def = symbols.Definition(p1, l, c);
        Assert.Single(def);
        Assert.Equal("/$defs/Request/properties/trademarkType", def[0].Pointer);
    }

    [Fact]
    public void SuggestCorrection_OffersClosestValidPath()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"Project.Address"}},
              {"id":"b","type":"Input","dataModelBindings":{"simpleBinding":"totallyUnrelatedThing"}}
            ]}}
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/s", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"address":{"type":"string"}}}}}""",
            }
        );
        var symbols = OpenSymbols(dir);
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (cl, cc) = At(layout, "\"Project.Address\"", 1);
        Assert.Equal("project.address", symbols.SuggestCorrection(p1, cl, cc));

        var (ul, uc) = At(layout, "\"totallyUnrelatedThing\"", 1);
        Assert.Null(symbols.SuggestCorrection(p1, ul, uc));
    }

    [Fact]
    public void ProposeRename_Task_AlsoRenamesItsUiFolder()
    {
        const string layout =
            """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"P","taskId":"Task_1"}}]}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/r","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}]}""",
                ["App/config/process/process.bpmn"] =
                    "<definitions><process><task id=\"Task_1\"/></process></definitions>",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P"]}}""",
                ["App/ui/Task_1/layouts/P.json"] = layout,
            }
        );
        var symbols = OpenSymbols(dir);

        var (l, c) = At(layout, "\"Task_1\"", 1);
        var renames = symbols
            .ProposeRename("App/ui/Task_1/layouts/P.json", l, c, "Task_One")
            .OfType<RenameFileEdit>()
            .ToList();
        Assert.Contains(
            renames,
            e => e.OldPath == "App/ui/Task_1/Settings.json" && e.NewPath == "App/ui/Task_One/Settings.json"
        );
        Assert.Contains(
            renames,
            e => e.OldPath == "App/ui/Task_1/layouts/P.json" && e.NewPath == "App/ui/Task_One/layouts/P.json"
        );
    }

    [Fact]
    public void ProposeRename_Task_BpmnSiteUsesXmlEscaping_ConfigUsesJson()
    {
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/r","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}]}""",
                ["App/config/process/process.bpmn"] =
                    "<definitions><process><task id=\"Task_1\"/></process></definitions>",
            }
        );
        var symbols = OpenSymbols(dir);
        var edits = symbols.ProposeRename(Symbol.Task("Task_1"), "oppgåve").OfType<ReplaceEdit>().ToList();

        var bpmn = edits.Single(e => e.Span.File == "App/config/process/process.bpmn");
        Assert.Equal("\"oppgåve\"", bpmn.NewValue);
        Assert.DoesNotContain("\\u00", bpmn.NewValue);

        var meta = edits.Single(e => e.Span.File == "App/config/applicationmetadata.json");
        Assert.Contains("\\u00", meta.NewValue);
    }

    [Fact]
    public void PrepareRename_MultiBytePath_RangeCoversTheLeafExactly()
    {
        const string layout =
            """{"data":{"layout":[{"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"beløp.sum"}}]}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/mb","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"}]}""",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"beløp":{"type":"object","properties":{"sum":{"type":"string"}}}}}""",
            }
        );
        var symbols = OpenSymbols(dir);
        var bytes = Encoding.UTF8.GetBytes(layout);
        var sumByteCol = Encoding.UTF8.GetByteCount(layout[..layout.IndexOf("sum", StringComparison.Ordinal)]) + 1;

        var prep =
            symbols.PrepareRename("App/ui/Task_1/layouts/P1.json", 1, sumByteCol)
            ?? throw new InvalidOperationException("PrepareRename returned null");
        Assert.Equal("sum", prep.Placeholder);
        Assert.Equal(sumByteCol, prep.Range.Column);
        Assert.Equal("sum", Encoding.UTF8.GetString(bytes[(prep.Range.Column - 1)..(prep.Range.EndColumn - 1)]));
    }

    [Theory]
    [InlineData("..")]
    [InlineData("../evil")]
    [InlineData("a/b")]
    [InlineData("")]
    public void ProposeRename_Task_ToUnsafePathSegment_IsRefused(string newName)
    {
        const string layout =
            """{"data":{"layout":[{"id":"sum","type":"Summary2","target":{"type":"page","id":"P","taskId":"Task_1"}}]}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] =
                    """{"id":"ttd/r","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","taskId":"Task_1"}]}""",
                ["App/config/process/process.bpmn"] =
                    "<definitions><process><task id=\"Task_1\"/></process></definitions>",
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P"]}}""",
                ["App/ui/Task_1/layouts/P.json"] = layout,
            }
        );
        var symbols = OpenSymbols(dir);
        var (l, c) = At(layout, "\"Task_1\"", 1);
        Assert.Empty(symbols.ProposeRename("App/ui/Task_1/layouts/P.json", l, c, newName));
    }

    [Fact]
    public void ProposeRename_Component_IsScopedToItsLayoutSet()
    {
        const string layoutA = """
            {"data":{"layout":[
              {"id":"shared","type":"Input"},
              {"id":"summaryA","type":"Summary","componentRef":"shared"}
            ]}}
            """;
        const string layoutB = """
            {"data":{"layout":[
              {"id":"shared","type":"Input"},
              {"id":"summaryB","type":"Summary","componentRef":"shared"}
            ]}}
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/two"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["A"]}}""",
                ["App/ui/Task_1/layouts/A.json"] = layoutA,
                ["App/ui/Task_2/Settings.json"] = """{"pages":{"order":["B"]}}""",
                ["App/ui/Task_2/layouts/B.json"] = layoutB,
            }
        );
        var symbols = OpenSymbols(dir);
        const string aFile = "App/ui/Task_1/layouts/A.json";
        const string bFile = "App/ui/Task_2/layouts/B.json";

        var (l, c) = At(layoutA, "\"shared\"", 1);
        var edits = symbols.ProposeRename(aFile, l, c, "renamed").Cast<ReplaceEdit>().ToList();

        Assert.All(edits.Select(e => e.Span.File), file => Assert.True(file == aFile));
        Assert.DoesNotContain(edits, e => e.Span.File == bFile);
    }

    [Fact]
    public void Definition_ResolvesLayoutSetReference()
    {
        const string meta =
            """{"id":"ttd/ls","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[],"onEntry":{"show":"entry"}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = meta,
                ["App/ui/entry/Settings.json"] = """{"pages":{"order":["A"]}}""",
                ["App/ui/entry/layouts/A.json"] = """{"data":{"layout":[]}}""",
            }
        );
        var symbols = OpenSymbols(dir);
        const string metaFile = "App/config/applicationmetadata.json";

        var (l, c) = At(meta, "\"entry\"", 1);
        var def = symbols.Definition(metaFile, l, c);
        Assert.Single(def);
        Assert.Equal("App/ui/entry/Settings.json", def[0].File);

        var refs = symbols.References(metaFile, l, c, includeDeclaration: false);
        Assert.Single(refs);
        Assert.Equal(metaFile, refs[0].File);

        Assert.Null(symbols.PrepareRename(metaFile, l, c));
    }

    [Fact]
    public void Page_Navigation_IsScopedToItsLayoutSet()
    {
        const string settings = """{"pages":{"order":["Shared"]}}""";
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/two"),
                ["App/ui/Task_1/Settings.json"] = settings,
                ["App/ui/Task_1/layouts/Shared.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/Task_2/Settings.json"] = settings,
                ["App/ui/Task_2/layouts/Shared.json"] = """{"data":{"layout":[]}}""",
            }
        );
        var symbols = OpenSymbols(dir);

        var (l, c) = At(settings, "\"Shared\"", 1);
        var def = symbols.Definition("App/ui/Task_1/Settings.json", l, c);
        Assert.Single(def);
        Assert.Equal("App/ui/Task_1/layouts/Shared.json", def[0].File);
    }

    private const string CSharpModelSource = """
        namespace App.Models;

        public class Root
        {
            [JsonPropertyName("address")]
            public Address Adr { get; set; }
        }

        public class Address
        {
            [JsonPropertyName("street")]
            public string StreetField { get; set; }
        }
        """;

    private const string CSharpModelLayout = """
        {"data":{"layout":[
          {"id":"f","type":"Input","dataModelBindings":{"simpleBinding":"address.street"}}
        ]}}
        """;

    private const string CSharpModelLayoutFile = "App/ui/Task_1/layouts/P.json";

    private const string CSharpModelMetadata =
        """{"id":"ttd/cs","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"m","taskId":"Task_1","appLogic":{"classRef":"App.Models.Root"}}]}""";

    private static AppSymbols OpenCSharpModelApp()
    {
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = CSharpModelMetadata,
                ["App/ui/Task_1/Settings.json"] = """{"defaultDataType":"m","pages":{"order":["P"]}}""",
                [CSharpModelLayoutFile] = CSharpModelLayout,
                ["App/models/m.schema.json"] =
                    """{"properties":{"address":{"type":"object","properties":{"street":{"type":"string"}}}}}""",
                ["App/models/Root.cs"] = CSharpModelSource,
            }
        );
        var config = AppConfigEngine.Open(dir);
        config.Build();
        return new AppSymbols(config);
    }

    [Fact]
    public void Definition_DataModelBinding_ResolvesToCSharpModelAndSchema()
    {
        var symbols = OpenCSharpModelApp();

        var (l, c) = At(CSharpModelLayout, "street", 1);
        var def = symbols.Definition(CSharpModelLayoutFile, l, c);

        Assert.Contains(def, s => s.File == "App/models/Root.cs" && s.Line > 0);
        Assert.Contains(def, s => s.File == "App/models/m.schema.json");
    }

    [Fact]
    public void References_FromCSharpModelProperty_FindJsonBindings()
    {
        var symbols = OpenCSharpModelApp();

        var (l, c) = At(CSharpModelSource, "StreetField", 1);
        var refs = symbols.References("App/models/Root.cs", l, c, includeDeclaration: false);

        Assert.Contains(refs, s => s.File == CSharpModelLayoutFile);
    }

    [Fact]
    public void Definition_ClassRef_ResolvesToTheCSharpClass()
    {
        var symbols = OpenCSharpModelApp();
        var (l, c) = At(CSharpModelMetadata, "App.Models.Root", 1);

        var def = symbols.Definition("App/config/applicationmetadata.json", l, c);

        Assert.Single(def);
        Assert.Equal("App/models/Root.cs", def[0].File);
        var (classLine, _) = At(CSharpModelSource, "public class Root", 1);
        Assert.Equal(classLine, def[0].Line);
    }

    [Fact]
    public void References_FromCSharpClassIdentifier_FindClassRefSite()
    {
        var symbols = OpenCSharpModelApp();
        var (l, c) = At(CSharpModelSource, "Root", 1);

        var refs = symbols.References("App/models/Root.cs", l, c, includeDeclaration: false);

        Assert.Single(refs);
        Assert.Equal("App/config/applicationmetadata.json", refs[0].File);
        Assert.Equal("/dataTypes/0/appLogic/classRef", refs[0].Pointer);
    }

    [Fact]
    public void PrepareRename_OnClassRef_IsRefused()
    {
        var symbols = OpenCSharpModelApp();
        var (l, c) = At(CSharpModelMetadata, "App.Models.Root", 1);
        Assert.Null(symbols.PrepareRename("App/config/applicationmetadata.json", l, c));
    }

    [Fact]
    public void Definition_ResolvesRefsInsidePageLevelHidden()
    {
        const string layout = """
            {
              "data": {
                "hidden": ["equals", ["component", "field-a"], ["dataModel", "project.x"]],
                "layout": [
                  { "id": "field-a", "type": "Input", "dataModelBindings": { "simpleBinding": "other" } }
                ]
              }
            }
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/nav", "model"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] =
                    """{"properties":{"project":{"type":"object","properties":{"x":{"type":"string"}}},"other":{"type":"string"}}}""",
            }
        );
        var symbols = OpenSymbols(dir);
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (cl, cc) = At(layout, "\"field-a\"", 1);
        var compDef = symbols.Definition(p1, cl, cc);
        Assert.Single(compDef);
        Assert.Equal("/data/layout/0", compDef[0].Pointer);

        var (pl, pc) = At(layout, ".x\"", 1);
        var pathDef = symbols.Definition(p1, pl, pc);
        Assert.Single(pathDef);
        Assert.Equal("App/models/model.schema.json", pathDef[0].File);
        Assert.Equal("/properties/project/properties/x", pathDef[0].Pointer);
    }

    [Fact]
    public void References_FromInsideLayoutFile_FindPageUses()
    {
        var symbols = OpenSymbols(NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var refs = symbols.References(p1, 1, 1, includeDeclaration: false);
        Assert.Contains(refs, s => s.File == "App/ui/Task_1/Settings.json" && s.Pointer == "/pages/order/0");

        var def = symbols.Definition(p1, 1, 1);
        Assert.Single(def);
        Assert.Equal(p1, def[0].File);
    }

    [Fact]
    public void References_InsideLayoutFile_MoreSpecificSymbolStillWins()
    {
        var symbols = OpenSymbols(NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";
        var (l, c) = At(NavLayout, "\"field-a\"", 1);
        var refs = symbols.References(p1, l, c, includeDeclaration: false);
        Assert.Single(refs);
        Assert.Equal("/data/layout/1/children/0", refs[0].Pointer);
    }

    [Fact]
    public void References_OnNonReferenceTokenInLayoutFile_ResolvesToNothing()
    {
        var symbols = OpenSymbols(NavApp());
        const string p1 = "App/ui/Task_1/layouts/P1.json";
        var (l, c) = At(NavLayout, "\"Input\"", 1);
        Assert.Empty(symbols.References(p1, l, c, includeDeclaration: false));
        Assert.Empty(symbols.Definition(p1, l, c));
    }

    private const string PageRenameSettings = """
        { "pages": { "order": ["P1", "P2"], "excludeFromPdf": ["P1"] } }
        """;
    private const string PageRenameOtherLayout = """
        {
          "data": {
            "layout": [
              { "id": "s2", "type": "Summary2", "target": { "type": "page", "id": "P1" } },
              { "id": "p", "type": "Paragraph", "link": ["linkToPage", "Go", "P1"] }
            ]
          }
        }
        """;

    private static MutableAppDirectory PageRenameApp() =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/pr"),
                ["App/ui/Task_1/Settings.json"] = PageRenameSettings,
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
                ["App/ui/Task_1/layouts/P2.json"] = PageRenameOtherLayout,
                ["App/ui/Task_2/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_2/layouts/P1.json"] = """{"data":{"layout":[]}}""",
            }
        );

    [Fact]
    public void Rename_Page_RewritesAllUsesAndMovesTheLayoutFile()
    {
        var symbols = OpenSymbols(PageRenameApp());
        const string settings = "App/ui/Task_1/Settings.json";

        var (l, c) = At(PageRenameSettings, "\"P1\"", 1);
        var edits = symbols.ProposeRename(settings, l, c, "Front");

        var replaces = edits.OfType<ReplaceEdit>().ToList();
        Assert.Equal(4, replaces.Count);
        Assert.All(replaces, r => Assert.True(r.NewValue == "\"Front\""));
        Assert.Equal(
            new[]
            {
                (settings, "/pages/order/0"),
                (settings, "/pages/excludeFromPdf/0"),
                ("App/ui/Task_1/layouts/P2.json", "/data/layout/0/target/id"),
                ("App/ui/Task_1/layouts/P2.json", "/data/layout/1/link/2"),
            }.OrderBy(x => x),
            replaces.Select(r => (r.Span.File, r.Span.Pointer)).OrderBy(x => x)
        );

        var moves = edits.OfType<RenameFileEdit>().ToList();
        Assert.Single(moves);
        Assert.Equal("App/ui/Task_1/layouts/P1.json", moves[0].OldPath);
        Assert.Equal("App/ui/Task_1/layouts/Front.json", moves[0].NewPath);

        Assert.DoesNotContain(
            edits.OfType<ReplaceEdit>(),
            r => r.Span.File.StartsWith("App/ui/Task_2/", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void Rename_Page_ToAnExistingPage_IsRefused()
    {
        var symbols = OpenSymbols(PageRenameApp());
        var (l, c) = At(PageRenameSettings, "\"P1\"", 1);
        Assert.Empty(symbols.ProposeRename("App/ui/Task_1/Settings.json", l, c, "P2"));
    }

    [Fact]
    public void SymbolHover_Component_ShowsTypePageSetAndBindings()
    {
        var symbols = OpenSymbols(NavApp());
        var (l, c) = At(NavLayout, "\"field-a\"", 1);

        var hover = symbols.SymbolHover("App/ui/Task_1/layouts/P1.json", l, c);

        Assert.NotNull(hover);
        Assert.Contains("**Component** `field-a` — Input", hover);
        Assert.Contains("Page `P1`", hover);
        Assert.Contains("layout-set `Task_1`", hover);
        Assert.Contains("simpleBinding → `project.x`", hover);
        Assert.Contains("1 reference", hover);
    }

    [Fact]
    public void SymbolHover_TextKey_ShowsValuePerLanguage()
    {
        var symbols = OpenSymbols(NavApp());
        var (l, c) = At(NavLayout, "\"key.a\"", 1);

        var hover = symbols.SymbolHover("App/ui/Task_1/layouts/P1.json", l, c);

        Assert.Contains("**Text key** `key.a`", hover);
        Assert.Contains("nb: `A`", hover);
    }

    [Fact]
    public void SymbolHover_BuiltinTextKey_SaysBuiltIn()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"in","type":"Input","dataModelBindings":{"simpleBinding":"x"},"textResourceBindings":{"title":"general.back"}}
            ]}}
            """;
        var dir = new MutableAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/bi"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = layout,
                ["App/models/model.schema.json"] = """{"properties":{"x":{"type":"string"}}}""",
            }
        );
        var symbols = OpenSymbols(dir);
        var (l, c) = At(layout, "\"general.back\"", 1);

        var hover = symbols.SymbolHover("App/ui/Task_1/layouts/P1.json", l, c);

        Assert.Contains("**Text key** `general.back`", hover);
        Assert.Contains("Built-in frontend text", hover);
    }

    [Fact]
    public void SymbolHover_DataModelPath_ShowsSchemaType()
    {
        var symbols = OpenSymbols(NavApp());
        var (l, c) = At(NavLayout, ".x\"", 1);

        var hover = symbols.SymbolHover("App/ui/Task_1/layouts/P1.json", l, c);

        Assert.Contains("**Data model** `project.x`", hover);
        Assert.Contains("string", hover);
    }

    [Fact]
    public void SymbolHover_Page_ShowsSetAndComponentCount_AndNonSymbolIsNull()
    {
        var symbols = OpenSymbols(NavApp());
        const string settings = """{"pages":{"order":["P1"]}}""";

        var (l, c) = At(settings, "\"P1\"", 1);
        var hover = symbols.SymbolHover("App/ui/Task_1/Settings.json", l, c);
        Assert.Contains("**Page** `P1`", hover);
        Assert.Contains("Layout-set `Task_1`", hover);
        Assert.Contains("2 components", hover);

        var (nl, nc) = At(NavLayout, "\"Input\"", 1);
        Assert.Null(symbols.SymbolHover("App/ui/Task_1/layouts/P1.json", nl, nc));
    }

    [Fact]
    public void CodeLenses_LayoutFile_PageAndReferencedComponentOnly()
    {
        var symbols = OpenSymbols(NavApp());
        var lenses = symbols.CodeLenses("App/ui/Task_1/layouts/P1.json");

        Assert.Equal(2, lenses.Count);

        var page = lenses.Single(l => l.Range.Line == 1);
        Assert.Equal("1 reference", page.Title);
        Assert.Equal("App/ui/Task_1/Settings.json", page.Locations.Single().File);

        var component = lenses.Single(l => l.Range.Line > 1);
        Assert.Equal("1 reference", component.Title);
        Assert.Equal("/data/layout/1/children/0", component.Locations.Single().Pointer);
    }

    [Fact]
    public void CodeLenses_ResourceAndSchemaFiles()
    {
        var symbols = OpenSymbols(NavApp());

        var resource = symbols.CodeLenses("App/config/texts/resource.nb.json");
        var resourceLens = Assert.Single(resource);
        Assert.Equal("1 reference", resourceLens.Title);

        var schema = symbols.CodeLenses("App/models/model.schema.json");
        Assert.Equal(2, schema.Count);
        Assert.All(schema, l => Assert.True(l.Title == "1 reference"));
    }

    [Fact]
    public void CodeLenses_CSharpModelFile_ClassAndBoundProperties()
    {
        var symbols = OpenCSharpModelApp();
        var lenses = symbols.CodeLenses("App/models/Root.cs");

        Assert.Equal(3, lenses.Count);
        var (classLine, _) = At(CSharpModelSource, "public class Root", 1);
        var classLens = lenses.Single(l => l.Range.Line == classLine);
        Assert.Equal("1 reference", classLens.Title);
        Assert.Equal("App/config/applicationmetadata.json", classLens.Locations.Single().File);
        Assert.All(
            lenses.Where(l => l.Range.Line != classLine),
            l => Assert.True(l.Title == "1 reference" && l.Locations.Single().File == CSharpModelLayoutFile)
        );
    }

    private const string ExprCompletionLayout = """
        {
          "data": {
            "layout": [
              {
                "id": "comp-a",
                "type": "Input",
                "dataModelBindings": { "simpleBinding": "x" },
                "hidden": ["equals", ["dataModel", ""], "v"],
                "readOnly": ["equals", ["dataModel", "", "other"], "v"],
                "required": ["equals", ["component", ""], "v"],
                "extraText": ["text", ""],
                "extraOption": ["optionLabel", "", "v"],
                "extraLink": ["linkToPage", "Go", ""],
                "extraCount": ["countDataElements", ""],
                "extraPlain": ["equals", "", "v"]
              }
            ]
          }
        }
        """;
    private static readonly string[] _summary2ComponentRefPointers =
    [
        "/data/layout/1/target/id",
        "/data/layout/1/overrides/0/componentId",
    ];

    private static readonly string[] _summary2ComponentRenamePointers =
    [
        "/data/layout/0/id",
        "/data/layout/1/target/id",
        "/data/layout/1/overrides/0/componentId",
    ];

    private static readonly string[] _componentRenamePointers = ["/data/layout/0/id", "/data/layout/1/children/0"];

    private static readonly string[] _declaredDataTypes = ["model", "attachment"];

    private static AppSymbols OpenExprCompletionApp() =>
        OpenSymbols(
            new MutableAppDirectory(
                new()
                {
                    ["App/config/applicationmetadata.json"] =
                        """{"id":"ttd/ec","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"model","appLogic":{"classRef":"M"},"taskId":"Task_1"},{"id":"other"}]}""",
                    ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                    ["App/ui/Task_1/layouts/P1.json"] = ExprCompletionLayout,
                    ["App/models/model.schema.json"] = """{"properties":{"x":{"type":"string"}}}""",
                    ["App/models/other.schema.json"] = """{"properties":{"y":{"type":"string"}}}""",
                    ["App/options/countries.json"] = "[]",
                    ["App/config/texts/resource.nb.json"] =
                        """{"language":"nb","resources":[{"id":"key.a","value":"A"}]}""",
                }
            )
        );

    [Fact]
    public void Completions_InExpression_DataModelArg_OffersSchemaPaths()
    {
        var symbols = OpenExprCompletionApp();
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (l1, c1) = At(ExprCompletionLayout, "\"\"", 1);
        var def = symbols.Completions(p1, l1, c1);
        Assert.Contains(def, s => s.Label == "x");
        Assert.DoesNotContain(def, s => s.Label == "y");

        var (l2, c2) = At(ExprCompletionLayout, "\"\"", 2);
        var retargeted = symbols.Completions(p1, l2, c2);
        Assert.Contains(retargeted, s => s.Label == "y");
        Assert.DoesNotContain(retargeted, s => s.Label == "x");
    }

    [Fact]
    public void Completions_InExpression_OfferEachReferenceKind()
    {
        var symbols = OpenExprCompletionApp();
        const string p1 = "App/ui/Task_1/layouts/P1.json";

        var (cl, cc) = At(ExprCompletionLayout, "\"\"", 3);
        Assert.Contains(symbols.Completions(p1, cl, cc), s => s.Label == "comp-a");

        var (tl, tc) = At(ExprCompletionLayout, "\"\"", 4);
        var texts = symbols.Completions(p1, tl, tc);
        Assert.Contains(texts, s => s.Label == "key.a" && s.Detail == "text resource");
        Assert.Contains(texts, s => s.Label == "general.back" && s.Detail == "built-in text");

        var (ol, oc) = At(ExprCompletionLayout, "\"\"", 5);
        Assert.Contains(symbols.Completions(p1, ol, oc), s => s.Label == "countries");

        var (pl, pc) = At(ExprCompletionLayout, "\"\"", 6);
        Assert.Contains(symbols.Completions(p1, pl, pc), s => s.Label == "P1");

        var (dl, dc) = At(ExprCompletionLayout, "\"\"", 7);
        var types = symbols.Completions(p1, dl, dc);
        Assert.Contains(types, s => s.Label == "model");
        Assert.Contains(types, s => s.Label == "other");
    }

    [Fact]
    public void Completions_InExpression_NonReferenceArg_OffersNothing()
    {
        var symbols = OpenExprCompletionApp();
        var (l, c) = At(ExprCompletionLayout, "\"\"", 8);
        Assert.Empty(symbols.Completions("App/ui/Task_1/layouts/P1.json", l, c));
    }

    [Fact]
    public void PrepareRename_OnPageToken_ReturnsRange_ButNotFromFileRoot()
    {
        var symbols = OpenSymbols(PageRenameApp());

        var (l, c) = At(PageRenameSettings, "\"P1\"", 1);
        var prepare =
            symbols.PrepareRename("App/ui/Task_1/Settings.json", l, c)
            ?? throw new InvalidOperationException("PrepareRename returned null");
        Assert.Equal("P1", prepare.Placeholder);

        Assert.Null(symbols.PrepareRename("App/ui/Task_1/layouts/P1.json", 1, 1));
    }
}
