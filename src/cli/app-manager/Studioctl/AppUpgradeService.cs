using System.Globalization;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.BackendUpgrade;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FrontendUpgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov10;

namespace Altinn.Studio.AppManager.Studioctl;

internal sealed class AppUpgradeService : IDisposable
{
    // TODO: split into per-version, separate tfm for v9 etc...
    private const string DefaultProjectFile = "App/App.csproj";
    private const string DefaultProcessFile = "App/config/process/process.bpmn";
    private const string DefaultAppSettingsFolder = "App";
    private const string DefaultTargetFramework = "net8.0";
    private const string DefaultFrontendTargetVersion = "4";
    private const string DefaultBackendTargetVersion = "8.7.0";
    private const string DefaultIndexFile = "App/views/Home/Index.cshtml";
    private const string DefaultUiFolder = "App/ui/";
    private const string DefaultTextsFolder = "App/config/texts/";
    private const string DefaultLayoutSetName = "form";
    private const string DefaultApplicationMetadataFile = "App/config/applicationmetadata.json";
    private const string DefaultReceiptLayoutSetName = "receipt";

    private readonly SemaphoreSlim _upgradeLock = new(1, 1);

    public async Task<AppUpgradeResult> RunAsync(AppUpgradeRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Kind))
            return AppUpgradeResult.Invalid("upgrade kind is required");

        if (string.IsNullOrWhiteSpace(request.ProjectFolder))
            return AppUpgradeResult.Invalid("projectFolder is required");

        if (!UpgradeKinds.IsSupported(request.Kind))
            return AppUpgradeResult.Invalid($"unsupported upgrade kind: {request.Kind}");

        var projectFolder = Path.GetFullPath(request.ProjectFolder);
        if (!Directory.Exists(projectFolder))
            return AppUpgradeResult.Invalid($"projectFolder does not exist: {projectFolder}");

        await _upgradeLock.WaitAsync(cancellationToken);
        try
        {
            var output = new StringWriter(CultureInfo.InvariantCulture);
            var error = new StringWriter(CultureInfo.InvariantCulture);
            try
            {
                var exitCode = await RunUpgradeAsync(
                    request with
                    {
                        ProjectFolder = projectFolder,
                    },
                    output,
                    error,
                    cancellationToken
                );

                return AppUpgradeResult.Completed(exitCode, output.ToString(), error.ToString());
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                await error.WriteLineAsync(ex.Message);
                return AppUpgradeResult.Completed(exitCode: 1, output.ToString(), error.ToString());
            }
        }
        finally
        {
            _upgradeLock.Release();
        }
    }

    private static Task<int> RunUpgradeAsync(
        AppUpgradeRequest request,
        TextWriter output,
        TextWriter error,
        CancellationToken cancellationToken
    )
    {
        return request.Kind switch
        {
            UpgradeKinds.FrontendV4 => FrontendUpgrade.RunAsync(
                new FrontendUpgradeOptions(
                    ProjectFolder: request.ProjectFolder,
                    TargetVersion: DefaultFrontendTargetVersion,
                    IndexFile: DefaultIndexFile,
                    UiFolder: DefaultUiFolder,
                    TextsFolder: DefaultTextsFolder,
                    LayoutSetName: DefaultLayoutSetName,
                    ApplicationMetadataFile: DefaultApplicationMetadataFile,
                    ReceiptLayoutSetName: DefaultReceiptLayoutSetName,
                    SkipIndexFileUpgrade: false,
                    SkipLayoutSetUpgrade: false,
                    SkipSettingsUpgrade: false,
                    SkipLayoutUpgrade: false,
                    ConvertGroupTitles: false,
                    SkipSchemaRefUpgrade: false,
                    SkipFooterUpgrade: false,
                    SkipCustomReceiptUpgrade: false,
                    SkipChecks: false,
                    Output: output,
                    Error: error,
                    CancellationToken: cancellationToken
                )
            ),
            UpgradeKinds.BackendV8 => BackendUpgrade.RunAsync(
                new BackendUpgradeOptions(
                    ProjectFolder: request.ProjectFolder,
                    ProjectFile: DefaultProjectFile,
                    ProcessFile: DefaultProcessFile,
                    AppSettingsFolder: DefaultAppSettingsFolder,
                    TargetVersion: DefaultBackendTargetVersion,
                    TargetFramework: DefaultTargetFramework,
                    SkipCodeUpgrade: false,
                    SkipProcessUpgrade: false,
                    SkipCsprojUpgrade: false,
                    SkipDockerfileUpgrade: false,
                    SkipAppSettingsUpgrade: false,
                    Output: output,
                    Error: error,
                    CancellationToken: cancellationToken
                )
            ),
            UpgradeKinds.V10 => V8Tov10Upgrade.RunAsync(
                new V8Tov10UpgradeOptions(
                    ProjectFolder: request.ProjectFolder,
                    ProjectFile: DefaultProjectFile,
                    TargetFramework: DefaultTargetFramework,
                    SkipCsprojUpgrade: false,
                    ConvertPackageReferences: request.ConvertPackageReferences,
                    StudioRoot: request.StudioRoot,
                    Output: output,
                    Error: error,
                    CancellationToken: cancellationToken
                )
            ),
            _ => throw new InvalidOperationException($"Unsupported upgrade kind: {request.Kind}"),
        };
    }

    public void Dispose()
    {
        _upgradeLock.Dispose();
    }
}

internal static class UpgradeKinds
{
    public const string FrontendV4 = "frontend-v4";
    public const string BackendV8 = "backend-v8";
    public const string V10 = "v10";

    public static bool IsSupported(string kind) => kind is FrontendV4 or BackendV8 or V10;
}

internal sealed record AppUpgradeRequest(
    string Kind,
    string ProjectFolder,
    string? StudioRoot,
    bool ConvertPackageReferences
);

internal sealed record AppUpgradeResult(bool IsValid, int ExitCode, string Message, string Output, string Error)
{
    public static AppUpgradeResult Invalid(string message) => new(false, 1, message, "", "");

    public static AppUpgradeResult Completed(int exitCode, string output, string error) =>
        new(true, exitCode, exitCode == 0 ? "upgrade completed" : "upgrade failed", output, error);
}
