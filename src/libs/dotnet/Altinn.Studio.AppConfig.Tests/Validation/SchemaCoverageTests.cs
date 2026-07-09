using Altinn.Studio.AppConfig;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class SchemaCoverageTests
{
    [Fact]
    public void UnbundledAltinnSchemaUrl_YieldsNotCheckedInfo()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = """
                {"$schema":"https://altinncdn.no/schemas/json/application/application-metadata.schema.v1.json","id":"ttd/x","org":"ttd","title":{"nb":"x"},"partyTypesAllowed":{},"dataTypes":[]}
                """,
            }
        );

        var report = AppConfigEngine.Open(dir).ValidateSchemas();

        var skip = Assert.Single(
            report.Findings,
            f => f.Severity == Severity.Info && f.Message.Contains("not schema-checked")
        );
        Assert.Equal("JSONSCHEMA-VALID", skip.RuleId);
        Assert.Equal("App/config/applicationmetadata.json", skip.Position.File);
        Assert.Equal("/$schema", skip.Position.Pointer);
    }

    [Fact]
    public void NonAltinnSchemaUrl_StaysSilent()
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/models/model.schema.json"] = """
                {"$schema":"https://json-schema.org/draft/2020-12/schema","properties":{"a":{"type":"string"}}}
                """,
            }
        );

        var report = AppConfigEngine.Open(dir).ValidateSchemas();

        Assert.DoesNotContain(report.Findings, f => f.Message.Contains("not schema-checked"));
    }
}
