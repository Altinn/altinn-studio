using System.Text;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class DataModelPathScopeTests
{
    private const string Task1Page = "App/ui/Task_1/layouts/Side1.json";
    private const string Task2Page = "App/ui/Task_2/layouts/Side1.json";
    private const string ReceiptPage = "App/ui/CustomReceipt/layouts/receipt.json";
    private const string Modell1Schema = "App/models/modell1.schema.json";
    private const string Modell2Schema = "App/models/modell2.schema.json";
    private const string Modell2Class = "App/models/modell2.cs";

    private static readonly string _appDir = RepoFiles.Path("src", "test", "apps", "multiple-datamodels-test");

    private static readonly string[] _modell1TekstfeltBindings =
    [
        ReceiptPage + "#/data/layout/0/dataModelBindings/simpleBinding/field",
        Task1Page + "#/data/layout/2/dataModelBindings/simpleBinding/field",
        Task2Page + "#/data/layout/5/dataModelBindings/simpleBinding/field",
    ];

    private static readonly string[] _modell2TekstfeltBindings =
    [
        Task1Page + "#/data/layout/4/dataModelBindings/simpleBinding/field",
        Task2Page + "#/data/layout/6/dataModelBindings/simpleBinding/field",
    ];

    private static readonly string[] _modell3TekstfeltBindings =
    [
        ReceiptPage + "#/data/layout/2/dataModelBindings/simpleBinding/field",
        Task2Page + "#/data/layout/0/dataModelBindings/simpleBinding",
    ];

    private static readonly string[] _unpinnedAndPinnedToA =
    [
        "App/ui/Task_1/layouts/P1.json#/data/layout/0/dataModelBindings/simpleBinding",
        "App/ui/Task_1/layouts/P1.json#/data/layout/1/dataModelBindings/simpleBinding/field",
    ];

    private static readonly string[] _bothSchemaDeclarationsOfName =
    [
        "App/models/a.schema.json#/properties/name",
        "App/models/b.schema.json#/properties/name",
    ];

    [Fact]
    public void Definition_FromBindingPinnedToModell2_LandsInModell2Only()
    {
        var symbols = OpenSymbols();
        var (line, col) = PositionOf(Task1Page, "\"tekstfelt\"", 2);

        var definitions = symbols.Definition(Task1Page, line, col);

        Assert.Contains(definitions, d => d.File == Modell2Schema && d.Pointer == "/properties/tekstfelt");
        Assert.Contains(definitions, d => d.File == Modell2Class && d.Line > 0);
        Assert.All(definitions, d => Assert.True(d.File is Modell2Schema or Modell2Class, d.ToString()));
    }

    [Fact]
    public void References_FromModell2SchemaProperty_FindOnlyModell2Bindings()
    {
        var symbols = OpenSymbols();
        var (line, col) = PositionOf(Modell2Schema, "\"tekstfelt\": {", 1);

        var references = symbols.References(Modell2Schema, line, col, includeDeclaration: false);

        Assert.Equal(_modell2TekstfeltBindings, Sorted(references));
    }

    [Fact]
    public void References_FromModell2ClassProperty_FindOnlyModell2Bindings()
    {
        var symbols = OpenSymbols();
        var (line, col) = PositionOf(Modell2Class, "tekstfelt { get", 1);

        var references = symbols.References(Modell2Class, line, col, includeDeclaration: false);

        Assert.Equal(_modell2TekstfeltBindings, Sorted(references));
    }

    [Fact]
    public void References_FromBindingWithoutExplicitDataType_UseTheLayoutSetDefault()
    {
        var symbols = OpenSymbols();
        var (line, col) = PositionOf(Task2Page, "\"tekstfelt\"", 1);

        var references = symbols.References(Task2Page, line, col, includeDeclaration: false);

        Assert.Equal(_modell3TekstfeltBindings, Sorted(references));
    }

    [Fact]
    public void CodeLenses_OnEachSchema_CountOnlyItsOwnBindings()
    {
        var symbols = OpenSymbols();
        var (keyLine, _) = PositionOf(Modell1Schema, "\"tekstfelt\": {", 1);

        var lens = Assert.Single(symbols.CodeLenses(Modell1Schema), l => l.Range.Line == keyLine);

        Assert.Equal(_modell1TekstfeltBindings, Sorted(lens.Locations));
    }

    [Fact]
    public void BindingWithUnresolvableDataType_IsCandidateForEverySchemaWithThePath()
    {
        const string layout = """
            {"data":{"layout":[
              {"id":"unpinned","type":"Input","dataModelBindings":{"simpleBinding":"name"}},
              {"id":"pinnedA","type":"Input","dataModelBindings":{"simpleBinding":{"field":"name","dataType":"a"}}},
              {"id":"pinnedB","type":"Input","dataModelBindings":{"simpleBinding":{"field":"name","dataType":"b"}}}
            ]}}
            """;
        const string schema = """{"properties":{"name":{"type":"string"}}}""";
        const string page = "App/ui/Task_1/layouts/P1.json";
        var engine = AppConfigEngine.Open(
            new MutableAppDirectory(
                new()
                {
                    ["App/config/applicationmetadata.json"] =
                        """{"id":"ttd/two","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[{"id":"a","appLogic":{"classRef":"A"},"taskId":"Task_1"},{"id":"b","appLogic":{"classRef":"B"},"taskId":"Task_1"}]}""",
                    ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                    [page] = layout,
                    ["App/models/a.schema.json"] = schema,
                    ["App/models/b.schema.json"] = schema,
                }
            )
        );
        engine.Build();
        var symbols = new AppSymbols(engine);

        var (line, col) = PositionIn(layout, "\"name\"", 1);
        var definitions = symbols.Definition(page, line, col);
        var references = symbols.References(
            new Symbol(SymbolKind.DataModelPath, "name", "a"),
            includeDeclaration: false
        );

        Assert.Equal(_unpinnedAndPinnedToA, Sorted(references));
        Assert.Equal(_bothSchemaDeclarationsOfName, Sorted(definitions));
    }

    [Fact]
    public void Rename_OfDataModelPath_IsRefused()
    {
        var symbols = OpenSymbols();
        var (line, col) = PositionOf(Task1Page, "\"tekstfelt\"", 2);

        Assert.Null(symbols.PrepareRename(Task1Page, line, col));
        Assert.Empty(symbols.ProposeRename(Task1Page, line, col, "tekst"));
        Assert.Empty(symbols.ProposeRename(new Symbol(SymbolKind.DataModelPath, "tekstfelt", "modell2"), "tekst"));
    }

    private static AppSymbols OpenSymbols()
    {
        var engine = AppConfigEngine.Open(new FileSystemAppDirectory(_appDir));
        engine.Build();
        return new AppSymbols(engine);
    }

    private static IEnumerable<string> Sorted(IEnumerable<SourceSpan> spans) =>
        spans.Select(s => s.ToString()).Order(StringComparer.Ordinal);

    private static (int Line, int ByteColumn) PositionOf(string file, string token, int nth) =>
        PositionIn(File.ReadAllText(Path.Combine(_appDir, file)), token, nth);

    private static (int Line, int ByteColumn) PositionIn(string text, string token, int nth)
    {
        var index = -1;
        for (var k = 0; k < nth; k++)
        {
            index = text.IndexOf(token, index + 1, StringComparison.Ordinal);
            Assert.True(index >= 0, $"occurrence {nth} of {token} not found");
        }
        var inside = token.StartsWith('"') ? index + 1 : index;
        var lineStart = text.LastIndexOf('\n', inside) + 1;
        var line = text.AsSpan(0, lineStart).Count('\n') + 1;
        return (line, Encoding.UTF8.GetByteCount(text.AsSpan(lineStart, inside - lineStart)) + 1);
    }
}
