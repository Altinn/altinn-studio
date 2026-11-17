using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class LaunchSettingsMigrationTests : IDisposable
{
    private const string LaunchSettingsPath = "Properties/launchSettings.json";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<bool> Migrate() => LaunchSettingsMigration.Migrate(Path.Combine(_app.Root, "App", "App.csproj"));

    [Fact]
    public async Task Removes_the_application_url_from_the_app_profile()
    {
        _app.Write(
            LaunchSettingsPath,
            """
            {
              "profiles": {
                "App": {
                  "commandName": "Project",
                  "dotnetRunMessages": true,
                  "launchBrowser": false,
                  "applicationUrl": "http://local.altinn.cloud:8000",
                  "environmentVariables": {
                    "ASPNETCORE_ENVIRONMENT": "Development"
                  }
                }
              }
            }
            """
        );

        Assert.True(await Migrate());
        AssertLaunchSettings(
            """
            {
              "profiles": {
                "App": {
                  "commandName": "Project",
                  "dotnetRunMessages": true,
                  "launchBrowser": false,
                  "environmentVariables": {
                    "ASPNETCORE_ENVIRONMENT": "Development"
                  }
                }
              }
            }
            """
        );
        Assert.False(await Migrate());
    }

    [Fact]
    public async Task Renames_a_v8_AppRef_profile_without_its_application_url()
    {
        _app.Write(
            LaunchSettingsPath,
            """
            {
              "iisSettings": {
                "windowsAuthentication": false,
                "anonymousAuthentication": true
              },
              "profiles": {
                "IIS Express": {
                  "commandName": "IISExpress"
                },
                "AppRef": {
                  "commandName": "Project",
                  "launchBrowser": false,
                  "applicationUrl": "http://localhost:5005",
                  "environmentVariables": {
                    "ASPNETCORE_ENVIRONMENT": "Development"
                  }
                }
              }
            }
            """
        );

        Assert.True(await Migrate());
        AssertLaunchSettings(
            """
            {
              "profiles": {
                "App": {
                  "commandName": "Project",
                  "launchBrowser": false,
                  "environmentVariables": {
                    "ASPNETCORE_ENVIRONMENT": "Development"
                  },
                  "dotnetRunMessages": true
                }
              }
            }
            """
        );
    }

    private void AssertLaunchSettings(string expected)
    {
        var actual = JsonNode.Parse(_app.Read(LaunchSettingsPath));
        Assert.True(
            JsonNode.DeepEquals(JsonNode.Parse(expected), actual),
            $"Unexpected launch settings:{Environment.NewLine}{actual}"
        );
    }
}
