using System.Globalization;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ComponentFormPropertiesMigrationTests : IDisposable
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

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
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

        var secondResult = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
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

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();

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

    [Theory]
    [InlineData("5")]
    [InlineData("{}")]
    [InlineData("null")]
    public async Task ReportsConflictsWithInvalidIdsWithoutBlockingCleanup(string id)
    {
        _app.Write(
            "ui/Task_1/layouts/form.json",
            $$"""
            { "data": { "layout": [
              { "id": {{id}}, "type": "FileUpload", "required": false, "minNumberOfAttachments": 2 },
              { "id": "group", "type": "RepeatingGroup", "required": false, "minCount": 1 }
            ] } }
            """
        );

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(2, result.PropertiesRemoved);
        Assert.All(components, component => Assert.Null(Assert.IsType<JsonObject>(component)["required"]));
        var attachment = Assert.IsType<JsonObject>(components[0]);
        var group = Assert.IsType<JsonObject>(components[1]);
        Assert.Equal(2, Assert.IsAssignableFrom<JsonValue>(attachment["minNumberOfAttachments"]).GetValue<int>());
        Assert.Equal(1, Assert.IsAssignableFrom<JsonValue>(group["minCount"]).GetValue<int>());
        Assert.Equal(2, result.Messages.Todos.Count);
        Assert.Contains("<missing id>", result.Messages.Todos[0], StringComparison.Ordinal);
        Assert.Contains("group", result.Messages.Todos[1], StringComparison.Ordinal);
    }

    [Fact]
    public async Task LeavesSupportedPropertiesUntouched()
    {
        const string before = """
            { "data": { "layout": [
              { "id": "name", "type": "Input", "required": true, "readOnly": true },
              { "id": "list", "type": "List", "required": true },
              { "id": "attachment", "type": "FileUpload", "readOnly": true },
              { "id": "tagged-attachment", "type": "FileUploadWithTag", "readOnly": true }
            ] } }
            """;
        _app.Write("ui/Task_1/layouts/form.json", before);

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();

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

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
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

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
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
    public async Task RemovesRequiredFromKnownUnsupportedComponentsWithoutTodo()
    {
        WriteSubformMinimum(1);
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            { "data": { "layout": [
              { "id": "optional-group", "type": "Group", "required": false },
              { "id": "required-accordion", "type": "Accordion", "required": true },
              { "id": "required-add-to-list", "type": "AddToList", "required": true },
              { "id": "required-table", "type": "SimpleTable", "required": true },
              { "id": "required-subform", "type": "Subform", "layoutSet": "moped-subform", "required": true }
            ] } }
            """
        );

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var optionalGroup = Assert.IsType<JsonObject>(components[0]);
        var requiredAccordion = Assert.IsType<JsonObject>(components[1]);
        var requiredAddToList = Assert.IsType<JsonObject>(components[2]);
        var requiredTable = Assert.IsType<JsonObject>(components[3]);
        var requiredSubform = Assert.IsType<JsonObject>(components[4]);

        Assert.Equal(5, result.PropertiesRemoved);
        Assert.Null(optionalGroup["required"]);
        Assert.Null(requiredAccordion["required"]);
        Assert.Null(requiredAddToList["required"]);
        Assert.Null(requiredTable["required"]);
        Assert.Null(requiredSubform["required"]);
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

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();

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
              { "id": "third-party", "type": "ExtensionComponent", "required": true, "readOnly": true }
            ] } }
            """;
        _app.Write("ui/Task_1/layouts/form.json", before);

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();

        Assert.Equal(before, _app.Read("ui/Task_1/layouts/form.json"));
        Assert.Equal(0, result.FilesChanged);
        Assert.Empty(result.Messages.Messages);
    }

    [Theory]
    [InlineData("AddToList", "true", 2)]
    [InlineData("List", "false", 1)]
    [InlineData("SimpleTable", "[\"equals\", 1, 1]", 2)]
    [InlineData("Subform", "null", 2)]
    public async Task RemovesUnsupportedReadOnlyAndOnlyUnsupportedRequired(
        string type,
        string readOnly,
        int propertiesRemoved
    )
    {
        if (type == "Subform")
            WriteSubformMinimum(1);
        _app.Write(
            "ui/Task_1/layouts/form.json",
            $$"""
            { "data": { "layout": [
              { "id": "component", "type": "{{type}}", "layoutSet": "moped-subform", "required": true, "readOnly": {{readOnly}} }
            ] } }
            """
        );

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var component = Assert.IsType<JsonObject>(components[0]);

        Assert.Equal(1, result.FilesChanged);
        Assert.Equal(propertiesRemoved, result.PropertiesRemoved);
        Assert.False(component.ContainsKey("readOnly"));
        if (type == "List")
            Assert.True(Assert.IsAssignableFrom<JsonValue>(component["required"]).GetValue<bool>());
        else
            Assert.False(component.ContainsKey("required"));
        Assert.Empty(result.Messages.Messages);

        var secondResult = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        Assert.Equal(0, secondResult.FilesChanged);
        Assert.Equal(0, secondResult.PropertiesRemoved);
        Assert.Empty(secondResult.Messages.Messages);
    }

    [Theory]
    [InlineData("false", 2, true)]
    [InlineData("true", 0, true)]
    [InlineData("true", 2, false)]
    [InlineData("false", 0, false)]
    public async Task RemovesSubformRequirednessPreservesMetadataMinimumAndReportsOnlyConflicts(
        string required,
        int minimum,
        bool hasConflict
    )
    {
        WriteSubformMinimum(minimum);
        var metadataBefore = _app.Read("config/applicationmetadata.json");
        var settingsBefore = _app.Read("ui/moped-subform/Settings.json");
        _app.Write(
            "ui/Task_1/layouts/form.json",
            $$"""
            { "data": { "layout": [
              { "id": "mopeds", "type": "Subform", "layoutSet": "moped-subform", "required": {{required}} }
            ] } }
            """
        );

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);
        var component = Assert.IsType<JsonObject>(components[0]);

        Assert.Equal(1, result.PropertiesRemoved);
        Assert.False(component.ContainsKey("required"));
        Assert.Equal(metadataBefore, _app.Read("config/applicationmetadata.json"));
        Assert.Equal(settingsBefore, _app.Read("ui/moped-subform/Settings.json"));
        Assert.Empty(result.Messages.Warnings);
        if (hasConflict)
        {
            var todo = Assert.Single(result.Messages.Todos);
            Assert.Contains("form.json", todo, StringComparison.Ordinal);
            Assert.Contains("mopeds", todo, StringComparison.Ordinal);
            Assert.Contains("moped", todo, StringComparison.Ordinal);
            Assert.Contains("config/applicationmetadata.json", todo, StringComparison.Ordinal);
            Assert.Contains("minCount", todo, StringComparison.Ordinal);
        }
        else
            Assert.Empty(result.Messages.Todos);

        var secondResult = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        Assert.Equal(0, secondResult.FilesChanged);
        Assert.Empty(secondResult.Messages.Messages);
    }

    [Theory]
    [InlineData("ui/moped-subform/Settings.json", null)]
    [InlineData("ui/moped-subform/Settings.json", "{}")]
    [InlineData("ui/moped-subform/Settings.json", "{")]
    [InlineData("config/applicationmetadata.json", null)]
    [InlineData("config/applicationmetadata.json", "{")]
    [InlineData("config/applicationmetadata.json", "{\"dataTypes\":[{\"id\":\"other\",\"minCount\":1}]}")]
    [InlineData("config/applicationmetadata.json", "{\"dataTypes\":[{\"id\":\"moped\"}]}")]
    [InlineData("config/applicationmetadata.json", "{\"dataTypes\":[{\"id\":\"moped\",\"minCount\":\"two\"}]}")]
    public async Task ReportsUnresolvedSubformMinimumWithoutBlockingCleanup(string path, string? content)
    {
        WriteSubformMinimum(1);
        if (content is null)
            File.Delete(Path.Combine(_app.Root, "App", path));
        else
            _app.Write(path, content);
        _app.Write(
            "ui/Task_1/layouts/form.json",
            """
            { "data": { "layout": [
              { "id": "mopeds", "type": "Subform", "layoutSet": "moped-subform", "required": true, "readOnly": true },
              { "id": "group", "type": "Group", "required": false }
            ] } }
            """
        );

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        var root = Assert.IsType<JsonObject>(JsonNode.Parse(_app.Read("ui/Task_1/layouts/form.json")));
        var data = Assert.IsType<JsonObject>(root["data"]);
        var components = Assert.IsType<JsonArray>(data["layout"]);

        Assert.Equal(3, result.PropertiesRemoved);
        Assert.All(components, node => Assert.False(Assert.IsType<JsonObject>(node).ContainsKey("required")));
        Assert.False(Assert.IsType<JsonObject>(components[0]).ContainsKey("readOnly"));
        var todo = Assert.Single(result.Messages.Todos);
        Assert.Contains("mopeds", todo, StringComparison.Ordinal);
        Assert.Contains("could not resolve", todo, StringComparison.Ordinal);
        Assert.Contains("minCount", todo, StringComparison.Ordinal);
        if (content is null)
            Assert.False(File.Exists(Path.Combine(_app.Root, "App", path)));
        else
            Assert.Equal(content, _app.Read(path));
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

        var result = await new ComponentFormPropertiesMigration(_app.Root).Migrate();
        var updated = _app.Read("ui/Task_1/layouts/form.json");

        Assert.Equal(1, result.PropertiesRemoved);
        Assert.Contains("// Keep this explanation.", updated, StringComparison.Ordinal);
        Assert.DoesNotContain("required", updated, StringComparison.Ordinal);
        Assert.Empty(result.Messages.Messages);
    }

    private void WriteSubformMinimum(int minimum)
    {
        _app.Write("ui/moped-subform/Settings.json", """{ "defaultDataType": "moped" }""");
        _app.Write(
            "config/applicationmetadata.json",
            $$"""{ "dataTypes": [{ "id": "moped", "minCount": {{minimum}}, "maxCount": 3 }] }"""
        );
    }
}
