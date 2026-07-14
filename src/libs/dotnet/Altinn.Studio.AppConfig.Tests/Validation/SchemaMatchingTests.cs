using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class SchemaMatchingTests
{
    [Theory]
    [InlineData("App/config/applicationmetadata.json", "application/application-metadata.schema.v1.json")]
    [InlineData("App/config/texts/resource.nb.json", "text-resources/text-resources.schema.v1.json")]
    [InlineData("App/ui/footer.json", "layout/footer.schema.v1.json")]
    [InlineData("App/ui/Task_1/Settings.json", "layout/layoutSettings.schema.v1.json")]
    [InlineData("App/ui/Settings.json", "layout/layoutSettings.schema.v1.json")]
    [InlineData("App/ui/Task_1/layouts/Page1.json", "layout/layout.schema.v1.json")]
    [InlineData("App/models/model.schema.json", null)]
    [InlineData("App/config/process/process.bpmn", null)]
    [InlineData("App/ui/Task_1/RuleConfiguration.json", null)]
    public void SchemaPathFor_MapsFilesByKind(string filePath, string? expected)
    {
        Assert.Equal(expected, SchemaValidator.SchemaPathFor(filePath));
    }

    [Fact]
    public void KindMatchedFileIsValidatedWithoutDeclaredSchema()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[{"id":"x","type":"Header"}]}}""",
            }
        );
        var schemas = SchemaSet.FromFiles(
            new Dictionary<string, string>
            {
                ["layout/layout.schema.v1.json"] = """
                {"properties":{"data":{"properties":{"layout":{"items":{"required":["size"]}}}}}}
                """,
            }
        );

        var report = AppConfigEngine.Open(dir).ValidateSchemas(schemas);

        var finding = Assert.Single(report.Findings, f => f.RuleId == "JSONSCHEMA-VALID");
        Assert.Contains("size", finding.Message);
        Assert.Equal("App/ui/Task_1/layouts/P1.json", finding.Position.File);
    }

    [Fact]
    public void EmptySchemaSetStaysSilent()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
            }
        );

        var report = AppConfigEngine.Open(dir).ValidateSchemas();

        Assert.DoesNotContain(report.Findings, f => f.RuleId == "JSONSCHEMA-VALID");
    }
}
