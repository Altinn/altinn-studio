using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class AppSettingsRemovedKeysDetectorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private MigrationResult Detect() => new AppSettingsRemovedKeysDetector(Path.Combine(_app.Root, "App")).Detect();

    [Fact]
    public void Reports_removed_keys_and_marks_values_that_are_not_the_default()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "AppSettings": {
                "AppBasePath": "",
                "OptionsFolder": "options/",
                "UiFolder": "layouts/",
                "AppOidcProvider": "altinn"
              }
            }
            """
        );
        _app.Write(
            "appsettings.Development.json",
            """
            { "appSettings": { "ConfigurationFolder": "config" } }
            """
        );

        var result = Detect();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(
            [
                "appsettings.Development.json: AppSettings:ConfigurationFolder",
                "appsettings.json: AppSettings:AppBasePath",
                "appsettings.json: AppSettings:OptionsFolder",
                "appsettings.json: AppSettings:UiFolder = \"layouts/\" (not the default 'ui/' - check where the app's files are)",
            ],
            result.Warnings.Where(w => w.Contains("appsettings", StringComparison.Ordinal))
        );
    }

    [Fact]
    public void Is_quiet_without_the_keys()
    {
        _app.Write("appsettings.json", """{ "AppSettings": { "AppOidcProvider": "altinn" } }""");
        _app.Write("appsettings.Staging.json", "not json");

        Assert.Empty(Detect().Messages);
    }
}
