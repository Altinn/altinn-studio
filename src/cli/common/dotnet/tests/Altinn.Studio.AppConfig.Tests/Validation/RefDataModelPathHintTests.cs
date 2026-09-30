using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class RefDataModelPathHintTests
{
    private const string Rule = "REF-DATAMODEL-PATH";

    private const string Schema = """
        {"properties":{
          "project":{"type":"object","properties":{"address":{"type":"string"}}},
          "items":{"type":"array","items":{"type":"object","properties":{"subField":{"type":"string"}}}}
        }}
        """;

    private static IReadOnlyList<Finding> Findings(string binding) =>
        ValidationEngine
            .Run(
                AppConfigEngine
                    .Open(
                        new InMemoryAppDirectory(
                            new()
                            {
                                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/hint", "model"),
                                ["App/ui/Task_1/Settings.json"] =
                                    """{"pages":{"order":["P1"]},"defaultDataType":"model"}""",
                                ["App/ui/Task_1/layouts/P1.json"] =
                                    $$$"""{"data":{"layout":[{"id":"a","type":"Input","dataModelBindings":{"simpleBinding":"{{{binding}}}"}}]}}""",
                                ["App/models/model.schema.json"] = Schema,
                            }
                        )
                    )
                    .Build()
            )
            .Findings;

    [Theory]
    [InlineData("Project.Address", "project.address")]
    [InlineData("items[0].subfield", "items[0].subField")]
    [InlineData("ITEMS[1].SUBFIELD", "items[1].subField")]
    public void PathDifferingOnlyInCase_SuggestsTheDeclaredSpelling(string binding, string declared)
    {
        var finding = Assert.Single(Findings(binding), f => f.RuleId == Rule);

        Assert.EndsWith($"; did you mean \"{declared}\"?", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void PathWithNoCaseVariant_HasNoSuggestion()
    {
        var finding = Assert.Single(Findings("project.adress"), f => f.RuleId == Rule);

        Assert.DoesNotContain("did you mean", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void DeclaredCaseOf_IsNullForADeclaredPath()
    {
        var props = new Dictionary<string, string> { ["items"] = "array", ["items.subField"] = "string" };

        Assert.Null(ModelPath.DeclaredCaseOf(props, "items[2].subField"));
        Assert.Equal("items[2].subField", ModelPath.DeclaredCaseOf(props, "Items[2].SubField"));
    }
}
