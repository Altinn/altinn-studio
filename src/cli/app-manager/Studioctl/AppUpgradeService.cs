using System.Globalization;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.BackendUpgrade;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FrontendUpgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov10;

namespace Altinn.Studio.AppManager.Studioctl;

internal sealed class AppUpgradeService : IDisposable
{
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
                    TargetVersion: request.TargetVersion ?? "4",
                    IndexFile: request.IndexFile ?? "App/views/Home/Index.cshtml",
                    UiFolder: request.UiFolder ?? "App/ui/",
                    TextsFolder: request.TextsFolder ?? "App/config/texts/",
                    LayoutSetName: request.LayoutSetName ?? "form",
                    ApplicationMetadataFile: request.ApplicationMetadataFile ?? "App/config/applicationmetadata.json",
                    ReceiptLayoutSetName: request.ReceiptLayoutSetName ?? "receipt",
                    SkipIndexFileUpgrade: request.SkipIndexFileUpgrade ?? false,
                    SkipLayoutSetUpgrade: request.SkipLayoutSetUpgrade ?? false,
                    SkipSettingsUpgrade: request.SkipSettingsUpgrade ?? false,
                    SkipLayoutUpgrade: request.SkipLayoutUpgrade ?? false,
                    ConvertGroupTitles: request.ConvertGroupTitles ?? false,
                    SkipSchemaRefUpgrade: request.SkipSchemaRefUpgrade ?? false,
                    SkipFooterUpgrade: request.SkipFooterUpgrade ?? false,
                    SkipCustomReceiptUpgrade: request.SkipCustomReceiptUpgrade ?? false,
                    SkipChecks: request.SkipChecks ?? false,
                    Output: output,
                    Error: error,
                    CancellationToken: cancellationToken
                )
            ),
            UpgradeKinds.BackendV8 => BackendUpgrade.RunAsync(
                new BackendUpgradeOptions(
                    ProjectFolder: request.ProjectFolder,
                    ProjectFile: request.Project ?? "App/App.csproj",
                    ProcessFile: request.Process ?? "App/config/process/process.bpmn",
                    AppSettingsFolder: request.AppSettingsFolder ?? "App",
                    TargetVersion: request.TargetVersion ?? "8.7.0",
                    TargetFramework: request.TargetFramework ?? "net8.0",
                    SkipCodeUpgrade: request.SkipCodeUpgrade ?? false,
                    SkipProcessUpgrade: request.SkipProcessUpgrade ?? false,
                    SkipCsprojUpgrade: request.SkipCsprojUpgrade ?? false,
                    SkipDockerfileUpgrade: request.SkipDockerfileUpgrade ?? false,
                    SkipAppSettingsUpgrade: request.SkipAppSettingsUpgrade ?? false,
                    Output: output,
                    Error: error,
                    CancellationToken: cancellationToken
                )
            ),
            UpgradeKinds.V10 => V8Tov10Upgrade.RunAsync(
                new V8Tov10UpgradeOptions(
                    ProjectFolder: request.ProjectFolder,
                    ProjectFile: request.Project ?? "App/App.csproj",
                    TargetFramework: request.TargetFramework ?? "net8.0",
                    SkipCsprojUpgrade: request.SkipCsprojUpgrade ?? false,
                    ConvertPackageReferences: request.ConvertPackageReferences ?? false,
                    StudioRoot: request.StudioRoot,
                    Output: output,
                    Error: error,
                    CancellationToken: cancellationToken
                )
            ),
            _ => Task.FromResult(-1),
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
    string? Project,
    string? Process,
    string? AppSettingsFolder,
    string? StudioRoot,
    string? TargetVersion,
    string? TargetFramework,
    string? IndexFile,
    string? UiFolder,
    string? TextsFolder,
    string? LayoutSetName,
    string? ApplicationMetadataFile,
    string? ReceiptLayoutSetName,
    bool? SkipCodeUpgrade,
    bool? SkipProcessUpgrade,
    bool? SkipCsprojUpgrade,
    bool? ConvertPackageReferences,
    bool? SkipDockerfileUpgrade,
    bool? SkipAppSettingsUpgrade,
    bool? SkipIndexFileUpgrade,
    bool? SkipLayoutSetUpgrade,
    bool? SkipSettingsUpgrade,
    bool? SkipLayoutUpgrade,
    bool? ConvertGroupTitles,
    bool? SkipSchemaRefUpgrade,
    bool? SkipFooterUpgrade,
    bool? SkipCustomReceiptUpgrade,
    bool? SkipChecks
);

internal sealed record AppUpgradeResult(bool IsValid, int ExitCode, string Message, string Output, string Error)
{
    public static AppUpgradeResult Invalid(string message) => new(false, 1, message, "", "");

    public static AppUpgradeResult Completed(int exitCode, string output, string error) =>
        new(true, exitCode, exitCode == 0 ? "upgrade completed" : "upgrade failed", output, error);
}
