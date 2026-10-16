using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.CalculationExpressions;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CalculationSchemaTests
{
    [Theory]
    [InlineData("{\"type\":\"number\",\"enum\":[0,1]}", "number")]
    [InlineData("{\"type\":\"integer\"}", "number")]
    [InlineData("{\"type\":[\"number\",\"null\"]}", "number")]
    [InlineData("{\"oneOf\":[{\"type\":\"number\"},{\"type\":\"null\"}]}", "number")]
    [InlineData("{\"anyOf\":[{\"type\":\"integer\"},{\"type\":\"number\"},{\"type\":\"null\"}]}", "number")]
    [InlineData("{\"type\":\"string\"}", "string")]
    [InlineData("{\"type\":[\"boolean\",\"null\"]}", "boolean")]
    [InlineData("{\"type\":[\"string\",\"number\"]}", null)]
    [InlineData("{\"oneOf\":[{}, {\"type\":\"number\"}]}", null)]
    [InlineData("{\"type\":\"object\"}", null)]
    public void ScalarType_RequiresOneConsistentNonNullType(string fieldSchema, string? expected)
    {
        using var app = new TempAppFolder();
        app.Write("models/model.schema.json", "{\"properties\":{\"field\":" + fieldSchema + "}}");

        Assert.Equal(expected, CalculationSchema.Load(app.Root, "model").GetScalarType("field"));
    }

    [Fact]
    public void ScalarType_ResolvesReferencedFieldsInsideRepeatingRows()
    {
        using var app = new TempAppFolder();
        app.Write(
            "models/model.schema.json",
            """
            {
              "properties": {"rows": {"type": "array", "items": {"$ref": "#/definitions/Row"}}},
              "definitions": {
                "Row": {"properties": {"status": {"$ref": "#/definitions/Status"}}},
                "Status": {"type": "integer", "enum": [0, 1, 2]}
              }
            }
            """
        );

        Assert.Equal("number", CalculationSchema.Load(app.Root, "model").GetScalarType("rows[2].status"));
    }

    [Fact]
    public void ScalarType_ResolvesASoleSchemaRootWithoutRedirectingWrites()
    {
        using var app = new TempAppFolder();
        app.Write(
            "models/model.schema.json",
            """
            {"properties":{"Root":{"properties":{"status":{"type":"integer","enum":[0,1]}}}}}
            """
        );
        var schema = CalculationSchema.Load(app.Root, "model");
        Assert.Equal("number", schema.GetScalarType("status"));
        Assert.False(schema.CanAllowNull("status"));
    }

    [Fact]
    public void ScalarType_RejectsRecursiveAlternatives()
    {
        using var app = new TempAppFolder();
        app.Write(
            "models/model.schema.json",
            """
            {"properties":{"field":{"$ref":"#/definitions/Loop"}},
             "definitions":{"Loop":{"oneOf":[{"$ref":"#/definitions/Loop"},{"type":"number"}]}}}
            """
        );

        Assert.Null(CalculationSchema.Load(app.Root, "model").GetScalarType("field"));
    }
}
