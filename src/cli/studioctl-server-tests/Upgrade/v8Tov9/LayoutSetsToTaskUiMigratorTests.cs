using Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class LayoutSetsToTaskUiMigratorTests : IDisposable
{
    private const string PageWithSubform =
        """{ "data": { "layout": [{ "id": "sub", "type": "Subform", "layoutSet": "subform" }] } }""";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public void FileAtDestinationPreventsEveryCopy()
    {
        const string mapping = """
            { "sets": [
              { "id": "first", "dataType": "Main", "tasks": ["Task_1"] },
              { "id": "second", "dataType": "Main", "tasks": ["Task_2"] }
            ] }
            """;
        _app.Write("ui/layout-sets.json", mapping);
        _app.Write("ui/first/layouts/Page.json", "{}");
        _app.Write("ui/second/layouts/Page.json", "{}");
        _app.Write("ui/Task_2", "Keep this file");

        var result = new LayoutSetsToTaskUiMigrator(_app.Root).Migrate();

        Assert.Single(result.Todos);
        Assert.False(result.LayoutSetsDeleted);
        Assert.Equal(mapping, _app.Read("ui/layout-sets.json"));
        Assert.Equal("Keep this file", _app.Read("ui/Task_2"));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1")));
    }

    [Fact]
    public void ConflictingTaskMappingsAreReportedWithoutPartiallyMovingAnything()
    {
        const string layoutSets = """
            {
              "sets": [
                { "id": "main", "dataType": "Main", "tasks": ["Task_1"] },
                { "id": "subform", "dataType": "Subform", "tasks": ["Task_1"] }
              ]
            }
            """;
        _app.Write("ui/layout-sets.json", layoutSets);
        _app.Write("ui/main/layouts/Page.json", "{}");
        _app.Write("ui/subform/layouts/Page.json", "{}");
        var migrator = new LayoutSetsToTaskUiMigrator(_app.Root);

        var first = migrator.Migrate();
        var second = migrator.Migrate();

        Assert.False(first.LayoutSetsDeleted);
        Assert.Single(first.Todos);
        Assert.Equal(first.Todos, second.Todos);
        Assert.Equal(layoutSets, _app.Read("ui/layout-sets.json"));
        Assert.True(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "main")));
        Assert.True(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "subform")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1")));
    }

    [Theory]
    [InlineData(PageWithSubform)]
    [InlineData(
        """
            {
              // Entries are filled in on the subform's own pages.
              "data": { "layout": [{ "id": "sub", "type": "Subform", "layoutSet": "subform", },], },
            }
            """
    )]
    public void SubformReferencedSetKeepsItsFolderEvenWithTasks(string mainPage)
    {
        WriteMainAndSubformSetsForTask1(mainPage);

        var result = new LayoutSetsToTaskUiMigrator(_app.Root).Migrate();

        Assert.Empty(result.Todos);
        Assert.True(result.LayoutSetsDeleted);
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "layouts", "Page.json")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "subform", "layouts", "Page.json")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "main")));
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("""{ "data": [] }""")]
    [InlineData("""{ "data": { "layout": {} } }""")]
    [InlineData("""{ "data": """)]
    public void JsonThatIsNotALayoutDoesNotStopTheSubformScan(string notALayout)
    {
        WriteMainAndSubformSetsForTask1(PageWithSubform);
        _app.Write("ui/main/layouts/Notes.json", notALayout);

        var result = new LayoutSetsToTaskUiMigrator(_app.Root).Migrate();

        Assert.Empty(result.Todos);
        Assert.True(result.LayoutSetsDeleted);
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "subform", "layouts", "Page.json")));
    }

    [Fact]
    public void SetMarkedAsSubformKeepsItsFolderEvenWithTasks()
    {
        // Studio marks a subform's set with "type": "subform", also before any Subform component uses it.
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "main", "dataType": "Main", "tasks": ["Task_1"] },
                { "id": "subform", "dataType": "Subform", "type": "subform", "tasks": ["Task_1"] }
              ]
            }
            """
        );
        _app.Write("ui/main/layouts/Page.json", "{ \"data\": { \"layout\": [] } }");
        _app.Write("ui/subform/layouts/Page.json", "{ \"data\": { \"layout\": [] } }");

        var result = new LayoutSetsToTaskUiMigrator(_app.Root).Migrate();

        Assert.Empty(result.Todos);
        Assert.True(result.LayoutSetsDeleted);
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "layouts", "Page.json")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "subform", "layouts", "Page.json")));
        Assert.Contains("\"type\": \"subform\"", _app.Read("ui/subform/Settings.json"), StringComparison.Ordinal);
        Assert.DoesNotContain("\"type\"", _app.Read("ui/Task_1/Settings.json"), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("""{ "id": "subform", "dataType": "Subform", "type": "subform", "tasks": ["Task_2"] }""", true)]
    [InlineData("""{ "id": "subform", "dataType": "Subform", "tasks": ["Task_2"] }""", false)]
    public void TaskOnlyASubformSetListsGetsATodo(string subformSet, bool marked)
    {
        // The v8 app showed the subform's pages for Task_2, which the subform's folder is not moved to.
        _app.Write(
            "ui/layout-sets.json",
            $$"""{ "sets": [{ "id": "main", "dataType": "Main", "tasks": ["Task_1"] }, {{subformSet}}] }"""
        );
        _app.Write("ui/main/layouts/Page.json", PageWithSubform);
        _app.Write("ui/subform/layouts/Page.json", "{ \"data\": { \"layout\": [] } }");

        var result = new LayoutSetsToTaskUiMigrator(_app.Root).Migrate();

        Assert.True(result.LayoutSetsDeleted);
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "subform", "layouts", "Page.json")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "Task_2")));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("copy folder 'subform' to 'Task_2'", todo, StringComparison.Ordinal);
        Assert.Equal(marked, todo.Contains("remove \"type\"", StringComparison.Ordinal));
    }

    [Fact]
    public void CompatiblePartialCopyIsCompletedAndCanThenBeRunAgain()
    {
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "legacy", "dataType": "Main", "tasks": ["Task_1"] }
              ]
            }
            """
        );
        _app.Write("ui/legacy/layouts/Page.json", "{ \"data\": { \"layout\": [] } }");
        _app.Write("ui/Task_1/layouts/Page.json", "{ \"data\": { \"layout\": [] } }");
        var migrator = new LayoutSetsToTaskUiMigrator(_app.Root);

        var resumed = migrator.Migrate();
        var repeated = migrator.Migrate();

        Assert.True(resumed.LayoutSetsDeleted);
        Assert.False(repeated.LayoutSetsDeleted);
        Assert.False(File.Exists(Path.Combine(_app.Root, "App", "ui", "layout-sets.json")));
        Assert.False(Directory.Exists(Path.Combine(_app.Root, "App", "ui", "legacy")));
        Assert.True(File.Exists(Path.Combine(_app.Root, "App", "ui", "Task_1", "layouts", "Page.json")));
        Assert.Contains(
            "\"defaultDataType\": \"Main\"",
            _app.Read("ui/Task_1/Settings.json"),
            StringComparison.Ordinal
        );
    }

    /// <summary>A main set and the set its Subform component uses, both listing task Task_1.</summary>
    private void WriteMainAndSubformSetsForTask1(string mainPage)
    {
        _app.Write(
            "ui/layout-sets.json",
            """
            {
              "sets": [
                { "id": "main", "dataType": "Main", "tasks": ["Task_1"] },
                { "id": "subform", "dataType": "Subform", "tasks": ["Task_1"] }
              ]
            }
            """
        );
        _app.Write("ui/main/layouts/Page.json", mainPage);
        _app.Write("ui/subform/layouts/Page.json", "{ \"data\": { \"layout\": [] } }");
    }
}
