using System.Globalization;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.BackendUpgrade;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FrontendUpgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Altinn.Studio.StudioctlServer.Studioctl;

internal sealed class AppUpgradeService : IDisposable
{
    // TODO: split into per-version upgrade services.
    private const string DefaultProjectFile = "App/App.csproj";
    private const string DefaultProcessFile = "App/config/process/process.bpmn";
    private const string DefaultAppSettingsFolder = "App";
    private const string DefaultBackendTargetFramework = "net8.0";
    private const string DefaultV9TargetFramework = "net10.0";
    private const int DefaultV9TargetMajorVersion = 9;
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
            // For v9 we use the new structured report format, which improves the CLI output format. For older upgrade kinds we still see the free-text output.
            var report = request.Kind == UpgradeKinds.V9 ? new UpgradeReport() : null;
            try
            {
                // We want to enforce a clean directory, so git diff will only show what the update did. An
                // unreadable repository is refused too - we cannot tell its changes apart from the upgrade's.
                if (!GitOperations.IsWorkingTreeClean(projectFolder, out var gitError))
                    return AppUpgradeResult.Invalid(
                        gitError is null
                            ? "The git repository has local changes. Commit or stash them before upgrading."
                            : $"Could not determine whether the git repository has local changes: {gitError}. Fix the repository before upgrading."
                    );

                var exitCode = await RunUpgradeAsync(
                    request with
                    {
                        ProjectFolder = projectFolder,
                    },
                    output,
                    error,
                    report,
                    cancellationToken
                );

                if (!V8Tov9Upgrade.IsError(exitCode))
                {
                    StageChanges(projectFolder, output, error, report);
                }

                return AppUpgradeResult.Completed(exitCode, output.ToString(), error.ToString(), Steps(report));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                await error.WriteLineAsync(FileAccessDiagnostics.Describe(ex));
                return AppUpgradeResult.Completed(exitCode: 1, output.ToString(), error.ToString(), Steps(report));
            }
        }
        finally
        {
            _upgradeLock.Release();
        }
    }

    private static IReadOnlyList<UpgradeStep> Steps(UpgradeReport? report) => report?.Steps ?? [];

    /// <summary>
    /// Stages the upgrade's changes, attributing the result to a step of its own. This runs after the
    /// upgrade returned, so it needs its own scope.
    /// </summary>
    private static void StageChanges(string projectFolder, TextWriter output, TextWriter error, UpgradeReport? report)
    {
        using (report is null ? UpgradeResultWriter.Use(output, error) : UpgradeResultWriter.Use(report, error))
        {
            UpgradeResultWriter.BeginStep("Staging changes");
            GitOperations.StageAllChanges(projectFolder);
        }
    }

    private static Task<int> RunUpgradeAsync(
        AppUpgradeRequest request,
        TextWriter output,
        TextWriter error,
        UpgradeReport? report,
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
                    TargetFramework: DefaultBackendTargetFramework,
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
            UpgradeKinds.V9 => V8Tov9Upgrade.RunAsync(
                new V8Tov9UpgradeOptions(
                    ProjectFolder: request.ProjectFolder,
                    ProjectFile: DefaultProjectFile,
                    TargetMajorVersion: DefaultV9TargetMajorVersion,
                    TargetFramework: DefaultV9TargetFramework,
                    SkipCsprojUpgrade: false,
                    ConvertPackageReferences: request.ConvertPackageReferences,
                    StudioRoot: request.StudioRoot,
                    Report: report ?? throw new InvalidOperationException("The v9 upgrade requires a report."),
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
    public const string V9 = "v9";

    public static bool IsSupported(string kind) => kind is FrontendV4 or BackendV8 or V9;
}

internal sealed record AppUpgradeRequest(
    string Kind,
    string ProjectFolder,
    string? StudioRoot,
    bool ConvertPackageReferences
);

internal sealed record AppUpgradeResult(
    bool IsValid,
    int ExitCode,
    string Message,
    string Output,
    string Error,
    IReadOnlyList<UpgradeStep> Steps
)
{
    public static AppUpgradeResult Invalid(string message) => new(false, 1, message, "", "", []);

    public static AppUpgradeResult Completed(
        int exitCode,
        string output,
        string error,
        IReadOnlyList<UpgradeStep> steps
    ) => new(true, exitCode, exitCode == 0 ? "upgrade completed" : "upgrade failed", output, error, steps);
}
