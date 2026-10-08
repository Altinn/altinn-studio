using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class GroupChildPageRuleTests
{
    private const string Rule = "CROSS-GROUP-CHILD-PAGE";

    private const string FormPage = """
        {"data":{"layout":[
          {"id":"g","type":"Group","children":["c"]},
          {"id":"c","type":"Input"}
        ]}}
        """;

    private const string SummaryPage = """
        {"data":{"layout":[
          {"id":"g","type":"Group","children":["c"]},
          {"id":"c","type":"Input"},
          {"id":"s","type":"Group","children":["c"]}
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
                                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/dup-group"),
                                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["summary","form"]}}""",
                                ["App/ui/Task_1/layouts/summary.json"] = SummaryPage,
                                ["App/ui/Task_1/layouts/form.json"] = FormPage,
                            }
                        )
                    )
                    .Build()
            )
            .Findings;

    [Fact]
    public void GroupRemovedAsDuplicate_IsNotCheckedAsAParent()
    {
        Assert.DoesNotContain(
            Findings(),
            f =>
                f.RuleId == Rule
                && f.Position.File.EndsWith("summary.json", StringComparison.Ordinal)
                && f.Position.Pointer.StartsWith("/data/layout/0/", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void ChildRemovedAsDuplicateFromTheGroupsPage_IsFlaggedOnTheKeptGroup()
    {
        var finding = Assert.Single(Findings(), f => f.RuleId == Rule);

        Assert.Equal("App/ui/Task_1/layouts/summary.json", finding.Position.File);
        Assert.Equal("/data/layout/2/children/0", finding.Position.Pointer);
        Assert.Equal(
            "child \"c\" of Group \"s\" is first declared on page \"form\"; the frontend removes its declaration "
                + "on the group's page \"summary\" as a duplicate",
            finding.Message
        );
    }

    [Fact]
    public void RemovedDuplicates_AreStillReportedAsDuplicateIds()
    {
        var duplicates = Findings().Where(f => f.RuleId == "UNIQUE-COMPONENT-ID").ToList();

        Assert.Equal(["/data/layout/0", "/data/layout/1"], duplicates.Select(f => f.Position.Pointer));
        Assert.All(duplicates, f => Assert.EndsWith("summary.json", f.Position.File, StringComparison.Ordinal));
    }
}
