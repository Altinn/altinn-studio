using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class LayoutPageOrderTests
{
    private const string FormPage = """{"data":{"layout":[{"id":"dup","type":"Input"}]}}""";
    private const string SummaryPage = """{"data":{"layout":[{"id":"dup","type":"Input"}]}}""";
    private const string RefPage = """{"data":{"layout":[{"id":"s","type":"Summary","componentRef":"dup"}]}}""";

    private static InMemoryAppDirectory AppListingSummaryBeforeForm() =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/order"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["summary","form","refs"]}}""",
                ["App/ui/Task_1/layouts/summary.json"] = SummaryPage,
                ["App/ui/Task_1/layouts/refs.json"] = RefPage,
                ["App/ui/Task_1/layouts/form.json"] = FormPage,
            }
        );

    [Fact]
    public void FrontendPageOrder_PutsArrayIndexNamesFirstThenOrdinal()
    {
        string[] pages = ["b", "10", "A", "2", "a", "01", "0", "4294967295"];

        var sorted = pages.Order(FrontendPageOrder.Instance);

        Assert.Equal(["0", "2", "10", "01", "4294967295", "A", "a", "b"], sorted);
    }

    [Fact]
    public void DuplicateId_KeepsTheDeclarationOnTheFirstPageByFileName()
    {
        var model = AppConfigEngine.Open(AppListingSummaryBeforeForm()).Build();

        var set = Assert.Single(model.LayoutSets);
        Assert.Equal("form", set.Components["dup"].Page);
        var finding = Assert.Single(ValidationEngine.Run(model).Findings, f => f.RuleId == "UNIQUE-COMPONENT-ID");
        Assert.Equal("App/ui/Task_1/layouts/summary.json", finding.Position.File);
        Assert.Contains("first at App/ui/Task_1/layouts/form.json", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void DuplicateId_OnWholeNumberPages_KeepsTheLowestNumber()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/numeric"),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["2","10"]}}""",
                ["App/ui/Task_1/layouts/10.json"] = FormPage,
                ["App/ui/Task_1/layouts/2.json"] = FormPage,
            }
        );

        var model = AppConfigEngine.Open(dir).Build();

        Assert.Equal("2", Assert.Single(model.LayoutSets).Components["dup"].Page);
    }

    [Fact]
    public void DuplicateId_DefinitionListsTheKeptDeclarationFirst_AndRenameCoversBoth()
    {
        var symbols = new AppSymbols(AppConfigEngine.Open(AppListingSummaryBeforeForm()));
        const string refs = "App/ui/Task_1/layouts/refs.json";
        var col = RefPage.IndexOf("\"dup\"", StringComparison.Ordinal) + 2;

        var definitions = symbols.Definition(refs, 1, col);
        var edits = symbols.ProposeRename(refs, 1, col, "renamed").Cast<ReplaceEdit>().ToList();

        Assert.Equal(
            ["App/ui/Task_1/layouts/form.json", "App/ui/Task_1/layouts/summary.json"],
            definitions.Select(d => d.File)
        );
        Assert.Equal(
            [
                "App/ui/Task_1/layouts/form.json",
                "App/ui/Task_1/layouts/refs.json",
                "App/ui/Task_1/layouts/summary.json",
            ],
            edits.Select(e => e.Span.File).Order(StringComparer.Ordinal)
        );
    }
}
