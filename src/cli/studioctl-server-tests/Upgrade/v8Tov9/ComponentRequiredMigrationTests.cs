using System.Globalization;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ComponentRequiredMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RemovesRequiredFlagsWithoutChangingMinimums()
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            {
              "data": {
                "layout": [
                  { "id": "optional", "type": "FileUpload", "required": false },
                  { "id": "optional-zero", "type": "FileUploadWithTag", "required": false, "minNumberOfAttachments": 0 },
                  { "id": "required", "type": "FileUpload", "required": true },
                  { "id": "required-two", "type": "FileUpload", "required": true, "minNumberOfAttachments": 2 }
                ]
              }
            }
            """
        );

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(4, result.PropertiesRemoved);
        Assert.Empty(result.Messages.Messages);
        Assert.All(components, component => Assert.Null(Assert.IsType<JsonObject>(component)["required"]));
        var required = Assert.IsType<JsonObject>(components[2]);
        var requiredTwo = Assert.IsType<JsonObject>(components[3]);
        Assert.Null(required["minNumberOfAttachments"]);
        Assert.Equal(2, Assert.IsAssignableFrom<JsonValue>(requiredTwo["minNumberOfAttachments"]).GetValue<int>());

        var secondResult = await new ComponentRequiredMigration(_app.Root).Migrate();
        Assert.Equal(0, secondResult.FilesChanged);
        Assert.Equal(0, secondResult.PropertiesRemoved);
        Assert.Empty(secondResult.Messages.Messages);
    }

    [Theory]
    [InlineData("false", "2")]
    [InlineData("true", "0")]
    public async Task RemovesConflictingRequirednessKeepsMinimumAndReportsTodo(string required, string minimum)
    {
        var before = $$"""
            { "data": { "layout": [
              { "id": "attachment", "type": "FileUpload", "required": {{required}}, "minNumberOfAttachments": {{minimum}} }
            ] } }
            """;
        _app.Write("ui/Task_1/layouts/form.json", before);

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();

        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var attachment = Assert.IsType<JsonObject>(components[0]);

        Assert.Equal(1, result.FilesChanged);
        Assert.Null(attachment["required"]);
        Assert.Equal(
            int.Parse(minimum, CultureInfo.InvariantCulture),
            Assert.IsAssignableFrom<JsonValue>(attachment["minNumberOfAttachments"]).GetValue<int>()
        );
        Assert.Empty(result.Messages.Warnings);
        Assert.Single(result.Messages.Todos);
        Assert.Contains("form.json", result.Messages.Todos[0], StringComparison.Ordinal);
        Assert.Contains("attachment", result.Messages.Todos[0], StringComparison.Ordinal);
        Assert.Contains("minNumberOfAttachments", result.Messages.Todos[0], StringComparison.Ordinal);
        Assert.True(result.Messages.RequiresManualFollowUp);
    }

    [Fact]
    public async Task IgnoresRequiredOnComponentsThatStillSupportIt()
    {
        const string before = """
            { "data": { "layout": [{ "id": "name", "type": "Input", "required": true }] } }
            """;
        _app.Write("ui/Task_1/layouts/form.json", before);

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();

        Assert.Equal(before, _app.Read("ui/Task_1/layouts/form.json"));
        Assert.Equal(0, result.FilesChanged);
        Assert.Empty(result.Messages.Messages);
    }

    [Fact]
    public async Task RemovesRepeatingGroupRequirednessWithoutChangingMinCount()
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            { "data": { "layout": [
              { "id": "required-group", "type": "RepeatingGroup", "required": true },
              { "id": "optional-group", "type": "RepeatingGroup", "required": false, "minCount": 0 }
            ] } }
            """
        );

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var requiredGroup = Assert.IsType<JsonObject>(components[0]);
        var optionalGroup = Assert.IsType<JsonObject>(components[1]);

        Assert.Equal(2, result.PropertiesRemoved);
        Assert.Null(requiredGroup["minCount"]);
        Assert.Null(requiredGroup["required"]);
        Assert.Null(optionalGroup["required"]);
        Assert.Empty(result.Messages.Messages);
    }

    [Theory]
    [InlineData("false", "2")]
    [InlineData("true", "0")]
    public async Task RemovesConflictingRepeatingGroupRequirednessKeepsMinCountAndReportsTodo(
        string required,
        string minimum
    )
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            $$"""
            { "data": { "layout": [
              { "id": "group", "type": "RepeatingGroup", "required": {{required}}, "minCount": {{minimum}} }
            ] } }
            """
        );

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var group = Assert.IsType<JsonObject>(components[0]);

        Assert.Null(group["required"]);
        Assert.Equal(
            int.Parse(minimum, CultureInfo.InvariantCulture),
            Assert.IsAssignableFrom<JsonValue>(group["minCount"]).GetValue<int>()
        );
        Assert.Single(result.Messages.Todos);
        Assert.Contains("minCount", result.Messages.Todos[0], StringComparison.Ordinal);
    }

    [Fact]
    public async Task RemovesRequiredFromKnownContainersWithoutTodo()
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            { "data": { "layout": [
              { "id": "optional-group", "type": "Group", "required": false },
              { "id": "required-accordion", "type": "Accordion", "required": true }
            ] } }
            """
        );

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var optionalGroup = Assert.IsType<JsonObject>(components[0]);
        var requiredAccordion = Assert.IsType<JsonObject>(components[1]);

        Assert.Equal(2, result.PropertiesRemoved);
        Assert.Null(optionalGroup["required"]);
        Assert.Null(requiredAccordion["required"]);
        Assert.Empty(result.Messages.Warnings);
        Assert.Empty(result.Messages.Todos);
    }

    [Fact]
    public async Task RemovesInvalidRequiredValuesWithoutChangingInvalidMinimum()
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            { "data": { "layout": [
              { "id": "invalid-required", "type": "FileUpload", "required": 1 },
              { "id": "invalid-minimum", "type": "FileUpload", "required": true, "minNumberOfAttachments": "two" }
            ] } }
            """
        );

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();

        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var invalidRequired = Assert.IsType<JsonObject>(components[0]);
        var invalidMinimum = Assert.IsType<JsonObject>(components[1]);

        Assert.Null(invalidRequired["required"]);
        Assert.Null(invalidMinimum["required"]);
        Assert.Equal(
            "two",
            Assert.IsAssignableFrom<JsonValue>(invalidMinimum["minNumberOfAttachments"]).GetValue<string>()
        );
        Assert.Empty(result.Messages.Messages);
    }

    [Fact]
    public async Task LeavesUnknownComponentTypeUntouched()
    {
        const string before = """
            { "data": { "layout": [
              { "id": "third-party", "type": "ExtensionComponent", "required": true }
            ] } }
            """;
        _app.Write("ui/Task_1/layouts/form.json", before);

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();

        Assert.Equal(before, _app.Read("ui/Task_1/layouts/form.json"));
        Assert.Equal(0, result.FilesChanged);
        Assert.Empty(result.Messages.Messages);
    }

    [Fact]
    public async Task PreservesCommentsWhileRemovingRequired()
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            { "data": { "layout": [
              // Keep this explanation.
              { "id": "attachment", "type": "FileUpload", "required": false }
            ] } }
            """
        );

        var result = await new ComponentRequiredMigration(_app.Root).Migrate();
        var updated = _app.Read("ui/Task_1/layouts/form.json");

        Assert.Equal(1, result.PropertiesRemoved);
        Assert.Contains("// Keep this explanation.", updated, StringComparison.Ordinal);
        Assert.DoesNotContain("required", updated, StringComparison.Ordinal);
        Assert.Empty(result.Messages.Messages);
    }
}
