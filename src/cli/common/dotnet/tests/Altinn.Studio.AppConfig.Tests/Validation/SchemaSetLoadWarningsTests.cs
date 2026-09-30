using Altinn.Studio.AppConfig.Validation.Schemas;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class SchemaSetLoadWarningsTests
{
    private static readonly Dictionary<string, string> _completeSet = new(StringComparer.Ordinal)
    {
        ["application/application-metadata.schema.v1.json"] = "{}",
        ["layout/expression.schema.v1.json"] = "{}",
        ["layout/footer.schema.v1.json"] = "{}",
        ["layout/layout.schema.v1.json"] = "{}",
        ["layout/layoutSettings.schema.v1.json"] = """{"definitions":{"GlobalPageSettingsFromSchema":{}}}""",
        ["text-resources/text-resources.schema.v1.json"] = "{}",
    };

    [Fact]
    public void CompleteSet_HasNoWarnings()
    {
        Assert.Empty(SchemaSet.FromFiles(_completeSet).LoadWarnings);
    }

    [Fact]
    public void Empty_HasNoWarnings()
    {
        Assert.Empty(SchemaSet.Empty.LoadWarnings);
    }

    [Fact]
    public void UnparseableSchema_IsReportedAndRestIsUsable()
    {
        var files = new Dictionary<string, string>(_completeSet, StringComparer.Ordinal)
        {
            ["layout/layout.schema.v1.json"] = "{not json",
        };

        var schemas = SchemaSet.FromFiles(files);

        Assert.Contains(
            schemas.LoadWarnings,
            w =>
                w.Contains("layout/layout.schema.v1.json", StringComparison.Ordinal)
                && w.Contains("parsed", StringComparison.Ordinal)
        );
        Assert.Contains(
            schemas.LoadWarnings,
            w =>
                w.Contains("layout/layout.schema.v1.json", StringComparison.Ordinal)
                && w.Contains("missing", StringComparison.Ordinal)
        );
        Assert.NotNull(schemas.Get("layout/footer.schema.v1.json"));
    }

    [Fact]
    public void MissingKnownSchema_IsReported()
    {
        var files = new Dictionary<string, string>(_completeSet, StringComparer.Ordinal);
        files.Remove("text-resources/text-resources.schema.v1.json");

        var schemas = SchemaSet.FromFiles(files);

        var warning = Assert.Single(schemas.LoadWarnings);
        Assert.Contains("text-resources/text-resources.schema.v1.json", warning, StringComparison.Ordinal);
        Assert.Contains("missing", warning, StringComparison.Ordinal);
    }

    [Fact]
    public void LayoutSettingsSchemaWithoutGlobalPageSettings_IsReported()
    {
        var files = new Dictionary<string, string>(_completeSet, StringComparer.Ordinal)
        {
            ["layout/layoutSettings.schema.v1.json"] = "{}",
        };

        var warning = Assert.Single(SchemaSet.FromFiles(files).LoadWarnings);
        Assert.Contains("GlobalPageSettingsFromSchema", warning, StringComparison.Ordinal);
        Assert.Contains("App/ui/Settings.json", warning, StringComparison.Ordinal);
    }

    [Fact]
    public void MissingExpressionSchema_IsReported()
    {
        var files = new Dictionary<string, string>(_completeSet, StringComparer.Ordinal);
        files.Remove("layout/expression.schema.v1.json");

        var warning = Assert.Single(SchemaSet.FromFiles(files).LoadWarnings);
        Assert.Contains("layout/expression.schema.v1.json", warning, StringComparison.Ordinal);
        Assert.Contains("missing", warning, StringComparison.Ordinal);
    }

    [Fact]
    public void MalformedExpressionSchema_IsReportedAndRestIsUsable()
    {
        var files = new Dictionary<string, string>(_completeSet, StringComparer.Ordinal)
        {
            ["layout/expression.schema.v1.json"] = "{not json",
        };

        var schemas = SchemaSet.FromFiles(files);

        Assert.Contains(
            schemas.LoadWarnings,
            w =>
                w.Contains("layout/expression.schema.v1.json", StringComparison.Ordinal)
                && w.Contains("parsed", StringComparison.Ordinal)
        );
        Assert.NotNull(schemas.Get("layout/layout.schema.v1.json"));
    }
}
