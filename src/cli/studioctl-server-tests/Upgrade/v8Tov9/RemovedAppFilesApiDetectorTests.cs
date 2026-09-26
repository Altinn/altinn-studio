using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// The syntax-only paths of the three detectors that follow the v9 app files change: the feature management
/// package is gone, the AppSettings folder settings are gone, and the service implementations are internal.
/// </summary>
public sealed class RemovedAppFilesApiDetectorTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private static IEnumerable<string> Locations(MigrationResult result) =>
        result.Warnings.Where(static w => w.Contains(".cs:", StringComparison.Ordinal));

    [Fact]
    public void FeatureManagement_reports_the_using_the_type_and_the_registration()
    {
        _app.Write(
            "logic/Flags.cs",
            """
            using Microsoft.FeatureManagement;
            public class Flags(IFeatureManager featureManager)
            {
                public Task<bool> On() => featureManager.IsEnabledAsync("JsonObjectInDataResponse");
            }
            """
        );
        _app.Write(
            "Program.cs",
            """
            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddFeatureManagement();
            """
        );

        var result = new RemovedFeatureManagementDetector(Scanner()).Detect();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Equal(
            [
                "Program.cs:2: AddFeatureManagement",
                "logic/Flags.cs:1: using Microsoft.FeatureManagement",
                "logic/Flags.cs:2: IFeatureManager",
            ],
            Locations(result).Select(Normalize)
        );
    }

    [Fact]
    public void FeatureManagement_is_quiet_for_an_app_that_reads_flags_through_IFrontendFeatures()
    {
        _app.Write(
            "logic/Flags.cs",
            """
            using Altinn.App.Core.Internal.App;
            public class Flags(IFrontendFeatures features)
            {
                public bool On() => features.IsEnabled("JsonObjectInDataResponse");
            }
            """
        );

        Assert.Empty(new RemovedFeatureManagementDetector(Scanner()).Detect().Messages);
    }

    [Fact]
    public void AppSettings_members_are_reported_by_name()
    {
        _app.Write(
            "logic/Paths.cs",
            """
            using Altinn.App.Core.Configuration;
            using Microsoft.Extensions.Options;
            public class Paths(IOptions<AppSettings> settings)
            {
                public string Options => Path.Join(settings.Value.AppBasePath, settings.Value.OptionsFolder);
                public string Schema => AppSettings.JSON_SCHEMA_FILENAME;
                public string Kept => settings.Value.AppOidcProvider;
            }
            """
        );

        var result = new RemovedAppSettingsMemberDetector(Scanner()).Detect();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Equal(
            [
                "logic/Paths.cs:5: AppBasePath",
                "logic/Paths.cs:5: OptionsFolder",
                "logic/Paths.cs:6: JSON_SCHEMA_FILENAME",
            ],
            Locations(result).Select(Normalize)
        );
    }

    [Fact]
    public void Internalized_types_are_reported_except_the_language_data_type()
    {
        _app.Write(
            "logic/CustomMetaData.cs",
            """
            using Altinn.App.Core.Internal.App;
            using Altinn.App.Core.Models;
            public class CustomMetaData
            {
                private readonly AppMetadata _inner = new AppMetadata(settings, frontendFeatures, serviceProvider);
                public List<ApplicationLanguage> Languages { get; } = [];
                public IAppOptionsFileHandler Handler { get; } = new AppOptionsFileHandler(settings);
            }
            """
        );

        var result = new InternalizedAppTypeDetector(Scanner()).Detect();

        Assert.True(result.RequiresManualFollowUp);
        // Without a semantic model the ApplicationLanguage data type cannot be told from the service, so it is
        // not reported; the distinctive names are, once per line.
        Assert.Equal(
            ["logic/CustomMetaData.cs:5: AppMetadata", "logic/CustomMetaData.cs:7: AppOptionsFileHandler"],
            Locations(result).Select(Normalize)
        );
    }

    private static string Normalize(string location) => location.Replace('\\', '/');
}
