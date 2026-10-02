using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class GlobalSettingsSchemaTests
{
    private const string GlobalSettings = "App/ui/Settings.json";
    private const string FolderSettings = "App/ui/Task_1/Settings.json";

    private const string GlobalPageSettings = """
        "GlobalPageSettingsFromSchema": {
          "type": "object",
          "properties": {
            "hideCloseButton": { "type": "boolean" },
            "taskNavigation": {
              "type": "array",
              "items": { "type": "object", "properties": { "taskId": { "type": "string" } }, "required": ["taskId"] }
            }
          }
        }
        """;

    private const string LayoutSettings = """
        "ILayoutSettings": {
          "type": "object",
          "properties": {
            "pages": {
              "allOf": [
                { "$ref": "#/definitions/GlobalPageSettingsFromSchema" },
                { "type": "object", "properties": { "order": { "type": "array" } }, "required": ["order"] }
              ]
            }
          },
          "required": ["pages"],
          "additionalProperties": false
        }
        """;

    private static readonly SchemaSet _schemas = SchemaSet.FromFiles(
        new Dictionary<string, string>
        {
            ["layout/layoutSettings.schema.v1.json"] =
                """{"$ref":"#/definitions/ILayoutSettings","definitions":{"""
                + GlobalPageSettings
                + ","
                + LayoutSettings
                + "}}",
        }
    );

    [Fact]
    public void GlobalSettings_WithPageSettingsAtTheTop_IsValid()
    {
        var findings = SchemaFindings(_schemas, """{"hideCloseButton":true,"taskNavigation":[{"taskId":"Task_1"}]}""");

        Assert.DoesNotContain(findings, f => f.Position.File == GlobalSettings);
    }

    [Fact]
    public void GlobalSettings_ValueOfTheWrongType_IsReportedAgainstTheDefinition()
    {
        var findings = SchemaFindings(_schemas, """{"hideCloseButton":"yes","taskNavigation":[{"name":"x"}]}""");

        var global = findings.Where(f => f.Position.File == GlobalSettings).ToList();
        Assert.Equal(
            ["/hideCloseButton", "/taskNavigation/0"],
            global.Select(f => f.Position.Pointer).Order(StringComparer.Ordinal)
        );
        Assert.All(
            global,
            f =>
                Assert.StartsWith(
                    "layoutSettings.schema.v1.json#/definitions/GlobalPageSettingsFromSchema /",
                    f.Message,
                    StringComparison.Ordinal
                )
        );
    }

    [Fact]
    public void FolderSettings_AreStillValidatedAgainstTheWholeSchema()
    {
        var findings = SchemaFindings(_schemas, """{"hideCloseButton":true}""", folderSettings: "{}");

        var folder = Assert.Single(findings, f => f.Position.File == FolderSettings);
        Assert.Contains("pages", folder.Message, StringComparison.Ordinal);
        Assert.StartsWith("layoutSettings.schema.v1.json :", folder.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void SchemaWithoutTheDefinition_LeavesGlobalSettingsUnvalidatedWithAWarning()
    {
        var schemas = SchemaSet.FromFiles(
            new Dictionary<string, string> { ["layout/layoutSettings.schema.v1.json"] = """{"required":["pages"]}""" }
        );

        var findings = SchemaFindings(schemas, """{"hideCloseButton":"yes"}""");

        Assert.DoesNotContain(findings, f => f.Position.File == GlobalSettings);
        Assert.Contains(
            schemas.LoadWarnings,
            w =>
                w.Contains("GlobalPageSettingsFromSchema", StringComparison.Ordinal)
                && w.Contains(GlobalSettings, StringComparison.Ordinal)
        );
    }

    private static IReadOnlyList<Finding> SchemaFindings(
        SchemaSet schemas,
        string globalSettings,
        string folderSettings = """{"pages":{"order":["P1"]}}"""
    )
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                [GlobalSettings] = globalSettings,
                [FolderSettings] = folderSettings,
                ["App/ui/Task_1/layouts/P1.json"] = """{"data":{"layout":[]}}""",
            }
        );

        return AppConfigEngine
            .Open(dir)
            .ValidateSchemas(schemas)
            .Findings.Where(f => f.RuleId == "JSONSCHEMA-VALID")
            .ToList();
    }
}
