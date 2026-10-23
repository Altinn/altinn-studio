using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class EnforceDataTypeTaskIdMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() => EnforceDataTypeTaskIdMigration.Migrate(Path.Combine(_app.Root, "App"));

    [Fact]
    public async Task Removes_the_setting_and_keeps_the_rest_of_the_file()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "AppSettings": {
                "RuntimeCookieName": "AltinnStudioRuntime",
                "EnforceDataTypeTaskId": true, // Only write data in its own task
                "RemoveHiddenData": false
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("= true", warning);
        Assert.DoesNotContain("taskIds", warning);
        Assert.Equal(
            """
            {
              "AppSettings": {
                "RuntimeCookieName": "AltinnStudioRuntime",
                "RemoveHiddenData": false
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Warns_how_to_fix_refused_writes_when_the_setting_was_off()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "AppSettings": {
                "RuntimeCookieName": "AltinnStudioRuntime",
                "EnforceDataTypeTaskId": false
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("Removed AppSettings:EnforceDataTypeTaskId = false from appsettings.json", warning);
        Assert.Contains("outside the tasks it is bound to", warning);
        Assert.Contains("fix a data binding", warning);
        Assert.Contains("taskIds in applicationmetadata.json", warning);
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
    public async Task Reads_a_string_value_as_configuration_does()
    {
        _app.Write(
            "appsettings.Development.json",
            "{\r\n  \"appSettings\": {\r\n    \"A\": true,\r\n    \"enforceDataTypeTaskId\": \"False\"\r\n  }\r\n}\r\n"
        );
        _app.Write(
            "appsettings.Staging.json",
            """
            {
              "AppSettings": {
                "EnforceDataTypeTaskId": "true"
              }
            }
            """
        );

        var result = await Migrate();

        Assert.Empty(result.Todos);
        Assert.Collection(
            result.Warnings,
            off =>
            {
                Assert.Contains("= \"False\" from appsettings.Development.json", off);
                Assert.Contains("taskIds", off);
            },
            on =>
            {
                Assert.Contains("= \"true\" from appsettings.Staging.json", on);
                Assert.DoesNotContain("taskIds", on);
            }
        );
        Assert.Equal(
            "{\r\n  \"appSettings\": {\r\n    \"A\": true\r\n  }\r\n}\r\n",
            _app.Read("appsettings.Development.json")
        );
    }

    [Theory]
    [InlineData("false", true)]
    [InlineData("true", false)]
    public async Task Leaves_a_setting_sharing_its_line_with_a_to_do(string value, bool advised)
    {
        var content = $$"""{ "AppSettings": { "EnforceDataTypeTaskId": {{value}}, "A": true } }""";
        _app.Write("appsettings.json", content);

        var result = await Migrate();

        var todo = Assert.Single(result.Todos);
        Assert.Contains("could not be removed automatically", todo);
        Assert.Equal(advised, todo.Contains("taskIds in applicationmetadata.json", StringComparison.Ordinal));
        Assert.Equal(content, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Leaves_the_name_in_other_sections_alone()
    {
        const string content = """
            {
              "MySettings": {
                "EnforceDataTypeTaskId": false
              },
              "AppSettings": { "A": true }
            }
            """;
        _app.Write("appsettings.json", content);

        Assert.Empty((await Migrate()).Messages);
        Assert.Equal(content, _app.Read("appsettings.json"));
    }
}
