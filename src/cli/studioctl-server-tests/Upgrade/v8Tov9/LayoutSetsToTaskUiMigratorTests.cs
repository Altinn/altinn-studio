using Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class LayoutSetsToTaskUiMigratorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

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
}
