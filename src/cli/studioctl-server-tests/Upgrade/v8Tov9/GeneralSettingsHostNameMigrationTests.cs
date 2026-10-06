using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class GeneralSettingsHostNameMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() =>
        new GeneralSettingsHostNameMigration(Path.Combine(_app.Root, "App")).Migrate();

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
        Assert.Equal("appsettings.json: GeneralSettings:HostName = \"altinn3local.no\"", result.Warnings[^1]);
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
            "{\r\n  \"generalSettings\": {\r\n    \"AltinnPartyCookieName\": \"AltinnPartyId\", // party\r\n"
                + "    \"hostname\": \"local.altinn.cloud\" // the old localtest\r\n  }\r\n}\r\n"
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(
            "{\r\n  \"generalSettings\": {\r\n    \"AltinnPartyCookieName\": \"AltinnPartyId\" // party\r\n  }\r\n}\r\n",
            _app.Read("appsettings.Development.json")
        );
    }

    [Fact]
    public async Task Removes_the_only_property_of_the_section()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "GeneralSettings": {
                "HostName": "tt02.altinn.no"
              }
            }
            """
        );

        await Migrate();

        Assert.Equal(
            """
            {
              "GeneralSettings": {
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Keeps_a_byte_order_mark()
    {
        _app.WriteBytes(
            "appsettings.json",
            [
                0xEF,
                0xBB,
                0xBF,
                .. "{\n  \"GeneralSettings\": {\n    \"HostName\": \"altinn3local.no\",\n    \"A\": 1\n  }\n}\n"u8,
            ]
        );

        await Migrate();

        Assert.Equal(
            [0xEF, 0xBB, 0xBF, .. "{\n  \"GeneralSettings\": {\n    \"A\": 1\n  }\n}\n"u8],
            _app.ReadBytes("appsettings.json")
        );
    }

    [Fact]
    public async Task Leaves_a_host_name_sharing_its_line_with_a_to_do()
    {
        const string content = """
            {
              "GeneralSettings": { "HostName": "altinn3local.no", "SoftValidationPrefix": "*WARNING*" }
            }
            """;
        _app.Write("appsettings.json", content);

        var result = await Migrate();

        Assert.True(result.RequiresManualFollowUp);
        Assert.StartsWith(
            "appsettings.json: GeneralSettings:HostName does not sit on a line",
            Assert.Single(result.Todos)
        );
        Assert.Equal(content, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Is_quiet_without_the_host_name()
    {
        const string content = """
            {
              "HostName": "at the root",
              "PlatformSettings": { "HostName": "in another section" },
              "GeneralSettings": { "SoftValidationPrefix": "*WARNING*", "Nested": { "HostName": "deeper" } }
            }
            """;
        _app.Write("appsettings.json", content);
        _app.Write("appsettings.Staging.json", "{ \"GeneralSettings\": { \"HostName\": not json");

        var result = await Migrate();

        Assert.Empty(result.Messages);
        Assert.Equal(content, _app.Read("appsettings.json"));
    }
}
