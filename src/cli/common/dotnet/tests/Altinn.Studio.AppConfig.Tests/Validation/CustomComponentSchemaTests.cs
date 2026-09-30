using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;
using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class CustomComponentSchemaTests
{
    private const string LayoutFile = "App/ui/Task_1/layouts/P1.json";

    private static readonly SchemaSet _schemas = SchemaSet.FromFiles(
        new Dictionary<string, string>
        {
            ["layout/layout.schema.v1.json"] = """
            {
              "$ref": "#/definitions/ILayoutFile",
              "definitions": {
                "ILayoutFile": {
                  "type": "object",
                  "properties": {
                    "data": {
                      "type": "object",
                      "properties": { "layout": { "type": "array", "items": { "$ref": "#/definitions/AnyComponent" } } },
                      "additionalProperties": false
                    }
                  },
                  "additionalProperties": false
                },
                "AnyComponent": {
                  "type": "object",
                  "allOf": [
                    { "if": { "properties": { "type": { "const": "Custom" } } }, "then": { "$ref": "#/definitions/CompCustom" } },
                    { "if": { "properties": { "type": { "const": "Input" } } }, "then": { "$ref": "#/definitions/CompInput" } }
                  ]
                },
                "Grid": { "type": "object", "properties": { "xs": { "type": "integer" } }, "additionalProperties": false },
                "CompCustom": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "type": { "const": "Custom" },
                    "hidden": { "type": "boolean" },
                    "grid": { "$ref": "#/definitions/Grid" },
                    "tagName": { "type": "string" },
                    "textResourceBindings": {
                      "type": "object",
                      "properties": { "title": { "type": "string" } },
                      "additionalProperties": false
                    }
                  },
                  "required": ["id", "type", "tagName"],
                  "additionalProperties": false
                },
                "CompInput": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "type": { "const": "Input" },
                    "textResourceBindings": {
                      "type": "object",
                      "properties": { "title": { "type": "string" } },
                      "additionalProperties": false
                    }
                  },
                  "required": ["id", "type"],
                  "additionalProperties": false
                }
              }
            }
            """,
        }
    );

    [Fact]
    public void CustomComponent_PropertiesAndTextBindingsBeyondTheSchema_AreNotReported()
    {
        var findings = SchemaFindings(
            """
            {"id":"wc","type":"Custom","tagName":"my-wc","hideIfEmpty":true,"resourceBindings":{"a":"b"},
             "textResourceBindings":{"title":"t","step":"s","noneRegistered":"n"}}
            """
        );

        Assert.Empty(findings);
    }

    [Fact]
    public void CustomComponent_MissingTagName_IsReported()
    {
        var finding = Assert.Single(SchemaFindings("""{"id":"wc","type":"Custom","hideIfEmpty":true}"""));

        Assert.Contains("tagName", finding.Message, StringComparison.Ordinal);
        Assert.Equal("/data/layout/0", finding.Position.Pointer);
    }

    [Fact]
    public void CustomComponent_DeclaredPropertyOfTheWrongType_IsReported()
    {
        var finding = Assert.Single(
            SchemaFindings("""{"id":"wc","type":"Custom","tagName":"my-wc","hidden":"yes","extra":1}""")
        );

        Assert.Equal("/data/layout/0/hidden", finding.Position.Pointer);
    }

    [Fact]
    public void CustomComponent_UnpermittedPropertyInsideADeclaredObject_IsReported()
    {
        var finding = Assert.Single(
            SchemaFindings("""{"id":"wc","type":"Custom","tagName":"my-wc","grid":{"xs":12,"huge":true}}""")
        );

        Assert.Equal("/data/layout/0/grid/huge", finding.Position.Pointer);
        Assert.Contains("not permitted", finding.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void OtherComponent_PropertiesAndTextBindingsBeyondTheSchema_AreReported()
    {
        var findings = SchemaFindings(
            """{"id":"in","type":"Input","hideIfEmpty":true,"textResourceBindings":{"title":"t","step":"s"}}"""
        );

        Assert.Equal(
            ["/data/layout/0/hideIfEmpty", "/data/layout/0/textResourceBindings/step"],
            findings.Select(f => f.Position.Pointer).Order(StringComparer.Ordinal)
        );
    }

    private static IReadOnlyList<Finding> SchemaFindings(string component)
    {
        var dir = new InMemoryAppDirectory(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json(),
                ["App/ui/Task_1/Settings.json"] = """{"pages":{"order":["P1"]}}""",
                [LayoutFile] = $$$"""{"data":{"layout":[{{{component}}}]}}""",
            }
        );

        return AppConfigEngine
            .Open(dir)
            .ValidateSchemas(_schemas)
            .Findings.Where(f => f.RuleId == "JSONSCHEMA-VALID" && f.Position.File == LayoutFile)
            .ToList();
    }
}
