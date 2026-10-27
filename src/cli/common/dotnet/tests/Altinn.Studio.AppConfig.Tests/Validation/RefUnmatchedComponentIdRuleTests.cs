using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class RefUnmatchedComponentIdRuleTests
{
    private const string Rule = "REF-UNMATCHED-COMPONENT-ID";

    private const string Layout = """
        {"data":{"layout":[
          {"id":"real","type":"Input"},
          {"id":"s2","type":"Summary2","target":{"type":"layoutSet"},"overrides":[{"componentId":"ghostOverride"},{"componentId":"real"}]},
          {"id":"s1","type":"Summary","componentRef":"ghostTarget","excludedChildren":["ghostChild","real"]},
          {"id":"rg","type":"RepeatingGroup","children":["real"],"tableColumns":{"ghostColumn":{},"real":{}}}
        ]}}
        """;

    private static IReadOnlyList<Finding> Findings() =>
        ValidationEngine
            .Run(
                AppConfigEngine
                    .Open(
                        new InMemoryAppDirectory(
                            new()
                            {
                                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/unmatched"),
                                ["App/ui/Task_1/Settings.json"] =
                                    """{"pages":{"order":["P1"]},"components":{"excludeFromPdf":["ghostPdf","real"]}}""",
                                ["App/ui/Task_1/layouts/P1.json"] = Layout,
                            }
                        )
                    )
                    .Build()
            )
            .Findings;

    [Fact]
    public void EntriesThatMatchNoComponent_AreWarnings()
    {
        var findings = Findings().Where(f => f.RuleId == Rule).OrderBy(f => f.Message, StringComparer.Ordinal);

        Assert.Equal(
            [
                (
                    "component \"ghostChild\" does not exist in layout-set \"Task_1\", so the excludedChildren entry has "
                        + "no effect (referenced from \"s1\")",
                    Severity.Warning
                ),
                (
                    "component \"ghostColumn\" does not exist in layout-set \"Task_1\", so the tableColumns entry has "
                        + "no effect (referenced from \"rg\")",
                    Severity.Warning
                ),
                (
                    "component \"ghostOverride\" does not exist in layout-set \"Task_1\", so the override has no effect "
                        + "(referenced from \"s2\")",
                    Severity.Warning
                ),
                (
                    "component \"ghostPdf\" does not exist in layout-set \"Task_1\", so the components.excludeFromPdf "
                        + "entry has no effect",
                    Severity.Warning
                ),
            ],
            findings.Select(f => (f.Message, f.Severity))
        );
    }

    [Fact]
    public void ReferencesThatMustResolve_StayErrorsOfRefLayoutComponentId()
    {
        var finding = Assert.Single(Findings(), f => f.RuleId == "REF-LAYOUT-COMPONENT-ID");

        Assert.Equal(Severity.Error, finding.Severity);
        Assert.Contains("\"ghostTarget\"", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Metadata_DeclaresWarningForVetExplain()
    {
        var metadata = Assert.Single(ValidationEngine.AllRuleMetadata, m => m.Id == Rule);

        Assert.Equal(Severity.Warning, metadata.DefaultSeverity);
    }
}
