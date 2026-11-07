using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class EnforceDataTypeTaskIdMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() => EnforceDataTypeTaskIdMigration.Migrate(Path.Combine(_app.Root, "App"));

    [Theory]
    [InlineData("true", false)]
    [InlineData("false", true)]
    [InlineData("\"False\"", true)]
    public async Task Warns_with_how_to_fix_refused_writes_only_when_the_setting_was_off(string value, bool advised)
    {
        _app.Write(
            "appsettings.json",
            $$"""
            {
              "AppSettings": {
                "RuntimeCookieName": "AltinnStudioRuntime",
                "EnforceDataTypeTaskId": {{value}}
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains($"Removed AppSettings:EnforceDataTypeTaskId = {value} from appsettings.json", warning);
        Assert.Equal(advised, warning.Contains("taskIds in applicationmetadata.json", StringComparison.Ordinal));
        Assert.Equal(
            """
            {
              "AppSettings": {
                "RuntimeCookieName": "AltinnStudioRuntime"
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Leaves_a_setting_sharing_its_line_with_a_to_do()
    {
        const string content = """{ "AppSettings": { "EnforceDataTypeTaskId": true, "A": true } }""";
        _app.Write("appsettings.json", content);

        var result = await Migrate();

        Assert.Single(result.Todos);
        Assert.Equal(content, _app.Read("appsettings.json"));
    }
}
