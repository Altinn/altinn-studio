using Altinn.Studio.AppConfig.Validation.Schemas;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class SchemaSetLoadWarningsTests
{
    private static readonly Dictionary<string, string> CompleteSet = new(StringComparer.Ordinal)
    {
        ["application/application-metadata.schema.v1.json"] = "{}",
        ["layout/expression.schema.v1.json"] = "{}",
        ["layout/footer.schema.v1.json"] = "{}",
        ["layout/layout.schema.v1.json"] = "{}",
        ["layout/layoutSettings.schema.v1.json"] = "{}",
        ["text-resources/text-resources.schema.v1.json"] = "{}",
    };

    [Fact]
    public void CompleteSet_HasNoWarnings()
    {
        Assert.Empty(SchemaSet.FromFiles(CompleteSet).LoadWarnings);
    }

    [Fact]
    public void Empty_HasNoWarnings()
    {
        Assert.Empty(SchemaSet.Empty.LoadWarnings);
    }

    [Fact]
    public void UnparseableSchema_IsReportedAndRestIsUsable()
    {
        var files = new Dictionary<string, string>(CompleteSet, StringComparer.Ordinal)
        {
            ["layout/layout.schema.v1.json"] = "{not json",
        };

        var schemas = SchemaSet.FromFiles(files);

        Assert.Contains(schemas.LoadWarnings, w => w.Contains("layout/layout.schema.v1.json") && w.Contains("parsed"));
        Assert.Contains(schemas.LoadWarnings, w => w.Contains("layout/layout.schema.v1.json") && w.Contains("missing"));
        Assert.NotNull(schemas.Get("layout/footer.schema.v1.json"));
    }

    [Fact]
    public void MissingKnownSchema_IsReported()
    {
        var files = new Dictionary<string, string>(CompleteSet, StringComparer.Ordinal);
        files.Remove("text-resources/text-resources.schema.v1.json");

        var schemas = SchemaSet.FromFiles(files);

        var warning = Assert.Single(schemas.LoadWarnings);
        Assert.Contains("text-resources/text-resources.schema.v1.json", warning);
        Assert.Contains("missing", warning);
    }

    [Fact]
    public void MissingExpressionSchema_IsReported()
    {
        var files = new Dictionary<string, string>(CompleteSet, StringComparer.Ordinal);
        files.Remove("layout/expression.schema.v1.json");

        var warning = Assert.Single(SchemaSet.FromFiles(files).LoadWarnings);
        Assert.Contains("layout/expression.schema.v1.json", warning);
        Assert.Contains("missing", warning);
    }

    [Fact]
    public void MalformedExpressionSchema_IsReportedAndRestIsUsable()
    {
        var files = new Dictionary<string, string>(CompleteSet, StringComparer.Ordinal)
        {
            ["layout/expression.schema.v1.json"] = "{not json",
        };

        var schemas = SchemaSet.FromFiles(files);

        Assert.Contains(
            schemas.LoadWarnings,
            w => w.Contains("layout/expression.schema.v1.json") && w.Contains("parsed")
        );
        Assert.NotNull(schemas.Get("layout/layout.schema.v1.json"));
    }
}
