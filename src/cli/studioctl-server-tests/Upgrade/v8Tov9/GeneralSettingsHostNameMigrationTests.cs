using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class GeneralSettingsHostNameMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() => GeneralSettingsHostNameMigration.Migrate(Path.Combine(_app.Root, "App"));

    [Fact]
    public async Task Removes_the_host_name_and_keeps_the_rest_of_the_file()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              // Local development
              "AppSettings": {
                "Hostname": "altinn3local.no",
                "RuntimeCookieName": "AltinnStudioRuntime"
              },
              "GeneralSettings": {
                "HostName": "altinn3local.no",
                "SoftValidationPrefix": "*WARNING*"
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Single(result.Warnings);
        Assert.Equal(
            """
            {
              // Local development
              "AppSettings": {
                "Hostname": "altinn3local.no",
                "RuntimeCookieName": "AltinnStudioRuntime"
              },
              "GeneralSettings": {
                "SoftValidationPrefix": "*WARNING*"
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Removes_the_last_property_and_the_comma_before_it()
    {
        _app.Write(
            "appsettings.Development.json",
            "{\r\n  \"generalSettings\": {\r\n    \"A\": 1,\r\n    \"hostname\": \"local.altinn.cloud\" // old localtest\r\n  }\r\n}\r\n"
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(
            "{\r\n  \"generalSettings\": {\r\n    \"A\": 1\r\n  }\r\n}\r\n",
            _app.Read("appsettings.Development.json")
        );
    }

    [Fact]
    public async Task Leaves_a_host_name_sharing_its_line_with_a_to_do()
    {
        const string content = """{ "GeneralSettings": { "HostName": "altinn3local.no", "A": 1 } }""";
        _app.Write("appsettings.json", content);

        var result = await Migrate();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Equal(content, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Leaves_host_names_in_other_sections_alone()
    {
        const string content = """
            {
              "MyIntegration": {
                "HostName": "example.com"
              },
              "GeneralSettings": { "SoftValidationPrefix": "*WARNING*" }
            }
            """;
        _app.Write("appsettings.json", content);
        _app.Write("appsettings.Staging.json", "not json");

        Assert.Empty((await Migrate()).Messages);
        Assert.Equal(content, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Skips_a_file_that_is_not_utf8()
    {
        byte[] content = [.. "{ \"GeneralSettings\": { \"HostName\": \""u8, 0xFF, .. "\" } }"u8];
        _app.WriteBytes("appsettings.json", content);

        Assert.Empty((await Migrate()).Messages);
        Assert.Equal(content, _app.ReadBytes("appsettings.json"));
    }
}
