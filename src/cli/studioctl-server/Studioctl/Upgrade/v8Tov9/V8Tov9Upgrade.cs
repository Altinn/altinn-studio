using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade.ProjectFile;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.DatepickerMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.DeprecatedLayoutPropertiesMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.IndexMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.NavigationButtonsMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.ConditionalRenderingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov9.RuleConfiguration.DataProcessingRules;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record V8Tov9UpgradeOptions(
    string ProjectFolder,
    string ProjectFile,
    int TargetMajorVersion,
    string TargetFramework,
    bool SkipCsprojUpgrade,
    bool ConvertPackageReferences,
    string? StudioRoot,
    UpgradeReport Report,
    TextWriter Error,
    CancellationToken CancellationToken,
    bool SkipSemanticAnalysis = false
);

internal static class V8Tov9Upgrade
{
    private static readonly Regex _programCsPathMatcher = new(
        @"^Program\.cs$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    private static readonly Regex _allCSharpFilesMatcher = new(
        @"\.cs$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    // Namespace the IServiceTask interface moved from / to between v8 and v9.
    private const string ServiceTaskOldNamespace = "Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks";
    private const string ServiceTaskNewNamespace = "Altinn.App.Core.Features.Process";

    internal static async Task<int> RunAsync(V8Tov9UpgradeOptions options)
    {
        using var outputScope = UpgradeConsole.Use(options.Report, options.Error);
        var projectFolder = options.ProjectFolder;
        if (!Directory.Exists(projectFolder))
            return WriteError($"Project folder does not exist: {projectFolder}");

        FileAttributes attr = File.GetAttributes(projectFolder);
        if ((attr & FileAttributes.Directory) != FileAttributes.Directory)
            return WriteError($"Project folder is not a directory: {projectFolder}");

        var projectFile = Path.Combine(projectFolder, options.ProjectFile);
        if (!File.Exists(projectFile))
            return WriteError($"Project file does not exist: {projectFile}");

        var projectChecks = new ProjectChecks.ProjectChecks(projectFile);
        if (!projectChecks.SupportedSourceVersion())
            return WriteError(
                $"Version(s) in project file {projectFile} are not supported for the 'v8Tov9' upgrade. "
                    + "This upgrade is for apps on version 8.x.x. "
                    + "Please ensure both Altinn.App.Core and Altinn.App.Api are version 8.0.0 or higher (but below 9.0.0).",
                exitCode: ExitUnsupportedVersion
            );

        // The C# source view is created — and, unless disabled, compiled — *before* the csproj bump:
        // the symbols the detectors look for are precisely the ones v9 removes, so only the current
        // (v8) dependency graph resolves them. The one scanner is shared by every C# step below;
        // rewriters keep it (and its semantic models) current through CSharpSourceScanner.Update.
        options.CancellationToken.ThrowIfCancellationRequested();
        var scanner = await CreateSourceScanner(projectFolder, projectFile, options);

        var returnCode = 0;
        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipCsprojUpgrade)
        {
            if (options.ConvertPackageReferences)
            {
                returnCode = await ConvertToProjectReferences(
                    projectFolder,
                    projectFile,
                    options.TargetFramework,
                    options.StudioRoot
                );
            }
            else
            {
                var targetVersion = await V9PackageVersionResolver.ResolveLatestTargetVersion(
                    projectFolder,
                    options.TargetMajorVersion,
                    options.CancellationToken
                );
                returnCode = await UpgradeProjectFile(projectFile, targetVersion, options.TargetFramework);
            }

            if (returnCode == 0)
                returnCode = await MigrateDockerfile(projectFolder, options.TargetFramework);
        }

        // The migration jobs below are independent of each other: one failing must not silently
        // skip the rest (e.g. a malformed process.bpmn failing the PDF service task migration must
        // not deprive the app of the service-owner policy check). Run them all and report the worst
        // return code.
        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await RemoveSwashbucklePackage(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await RemoveLoggingDebugPackage(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateOpenApiNamespace(scanner));

        // The v9 Altinn.App packages raise some transitive dependency floors; an app pinning them lower
        // fails to restore (NU1605). Only relevant when we actually bumped the csproj to v9 packages.
        if (!options.SkipCsprojUpgrade && !options.ConvertPackageReferences)
        {
            options.CancellationToken.ThrowIfCancellationRequested();
            returnCode = CombineExitCodes(
                returnCode,
                await MigrateNuGetDowngrades(projectFolder, projectFile, options.CancellationToken)
            );
        }

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateServiceTaskNamespace(scanner));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateEFormidlingRegistration(scanner));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateEFormidlingReceiversSignature(scanner, projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateCorrespondenceApis(scanner));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigratePlatformHttpExceptionApis(scanner));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateMisspelledApis(scanner));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateFileAnalysisNamespace(scanner));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await CheckRemovedCSharpApis(scanner, projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await CheckMaskinportenSettingsCollision(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateLaunchSettings(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateOrganizationLookupLayouts(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateCamelCaseLayoutProperties(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateDatepickerTimeStamp(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateHeadingLayouts(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateFileUploadWithTagLayouts(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateDatepickerFormats(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateDatepickerTextResourceKeys(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateGridXlSettings(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await ConvertConditionalRenderingRules(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await GenerateDataProcessors(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await CleanupLegacyRuleFiles(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateLayoutSetsToTaskUi(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateNavigationButtons(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateDeprecatedLayoutProperties(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateIndexCshtml(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigratePdfServiceTasks(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateServiceOwnerPolicy(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateEFormidlingServiceTasks(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await WarnFeedbackTasksBehindServiceTasks(projectFolder));

        return returnCode;
    }

    /// <summary>
    /// Reports a migrator's result on the current step and maps it to an exit code. Messages are reported
    /// in the order the migrator produced them, so a to-do reads directly after the warning explaining why
    /// the upgrade could not do it for you. Any to-do means the step requires manual follow-up. A clean run
    /// reports <paramref name="cleanText"/> with <paramref name="cleanStatus"/> - Skip for a check that
    /// found nothing to act on, Ok (the default) for a migration that applied.
    /// </summary>
    private static int ReportMigrationResult(
        MigrationResult result,
        string cleanText,
        UpgradeMessageStatus cleanStatus = UpgradeMessageStatus.Ok
    )
    {
        foreach (var message in result.Messages)
        {
            UpgradeConsole.Message(message.Status, message.Text);
        }

        if (result.RequiresManualFollowUp)
            return ExitManualActionRequired;

        if (result.Messages.Count == 0)
            UpgradeConsole.Message(cleanStatus, cleanText);

        return ExitSuccess;
    }

    /// <summary>
    /// Reports that the current step failed, and returns its exit code. The report is the only place this
    /// goes: the rendered step already tells the reader which job failed and why.
    /// </summary>
    private static int Fail(string message)
    {
        UpgradeConsole.Failed(message);
        return ExitError;
    }

    /// <summary>Reports that the current step failed with <paramref name="exception"/>.</summary>
    private static int Fail(string description, Exception exception) =>
        Fail($"{description}: {FileAccessDiagnostics.Describe(exception)}");

    static async Task<int> UpgradeProjectFile(string projectFile, string targetVersion, string targetFramework)
    {
        UpgradeConsole.BeginStep("Project file");
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile, targetVersion, targetFramework);
            await rewriter.Upgrade();
            UpgradeConsole.Ok($"Altinn.App packages set to {targetVersion}, target framework {targetFramework}");
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error upgrading project file", ex);
        }
    }

    static async Task<int> MigrateDockerfile(string projectFolder, string targetFramework)
    {
        UpgradeConsole.BeginStep("Dockerfile");
        try
        {
            return await DockerfileMigration.Migrate(projectFolder, targetFramework);
        }
        catch (Exception ex)
        {
            return Fail("Error migrating Dockerfile", ex);
        }
    }

    static async Task<int> RemoveSwashbucklePackage(string projectFile)
    {
        UpgradeConsole.BeginStep("Swashbuckle package");
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile);
            if (await rewriter.RemovePackageReference("Swashbuckle.AspNetCore"))
            {
                UpgradeConsole.Ok("Swashbuckle.AspNetCore package reference removed");
            }
            else
            {
                UpgradeConsole.Skip("No Swashbuckle.AspNetCore package reference");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error removing Swashbuckle.AspNetCore package reference", ex);
        }
    }

    // net10.0's shared framework now carries Microsoft.Extensions.Logging.Debug's DebugLoggerProvider
    // itself, so an app's own explicit reference to the (older) NuGet package collides with it at
    // build time (CS0433, ambiguous 'DebugLoggerProvider'). The provider is still wired up by default
    // through WebApplication.CreateBuilder, so dropping the package reference loses nothing.
    static async Task<int> RemoveLoggingDebugPackage(string projectFile)
    {
        UpgradeConsole.BeginStep("Logging.Debug package");
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile);
            if (await rewriter.RemovePackageReference("Microsoft.Extensions.Logging.Debug"))
            {
                UpgradeConsole.Ok("Microsoft.Extensions.Logging.Debug package reference removed");
            }
            else
            {
                UpgradeConsole.Skip("No Microsoft.Extensions.Logging.Debug package reference");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error removing Microsoft.Extensions.Logging.Debug package reference", ex);
        }
    }

    /// <summary>
    /// Parses the app's C# source once, shared by every C# migration step. Unless disabled, it first
    /// restores and compiles the app against its current (v8) packages so detection can use exact
    /// symbol information; when that fails (the app does not compile, no matching SDK, offline), the
    /// scanner degrades to syntax-only and detection over-reports rather than misses.
    /// </summary>
    static async Task<CSharpSourceScanner> CreateSourceScanner(
        string projectFolder,
        string projectFile,
        V8Tov9UpgradeOptions options
    )
    {
        if (options.SkipSemanticAnalysis)
        {
            return CSharpSourceScanner.ForProject(projectFile);
        }

        var semantic = await V8CompilationLoader.LoadAsync(projectFolder, projectFile, options.CancellationToken);
        return CSharpSourceScanner.ForProject(projectFile, semantic.Compilation);
    }

    static async Task<int> MigrateOpenApiNamespace(CSharpSourceScanner scanner)
    {
        UpgradeConsole.BeginStep("OpenAPI namespace");
        try
        {
            var migration = new UsingNamespaceMigration(scanner);
            migration.Migrate("Microsoft.OpenApi.Models", "Microsoft.OpenApi", _programCsPathMatcher);
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating OpenAPI namespace in Program.cs", ex);
        }
    }

    /// <summary>
    /// Raises explicit package versions to the floors the v9 Altinn.App packages require (NU1605
    /// downgrades), driven dynamically by parsing <c>dotnet restore</c> output.
    /// </summary>
    static async Task<int> MigrateNuGetDowngrades(
        string projectFolder,
        string projectFile,
        CancellationToken cancellationToken
    )
    {
        UpgradeConsole.BeginStep("NuGet downgrades");
        try
        {
            var resolver = new NuGetDowngradeResolver();
            var result = await resolver.ResolveAsync(projectFolder, projectFile, cancellationToken);
            return ReportMigrationResult(result, cleanText: "No package downgrades against the v9 dependency floors");
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            return Fail("Error resolving package downgrades", ex);
        }
    }

    /// <summary>Rewrites the IServiceTask namespace usings across all app C# files.</summary>
    static async Task<int> MigrateServiceTaskNamespace(CSharpSourceScanner scanner)
    {
        UpgradeConsole.BeginStep("IServiceTask namespace");
        try
        {
            var migration = new UsingNamespaceMigration(scanner);
            migration.Migrate(ServiceTaskOldNamespace, ServiceTaskNewNamespace, _allCSharpFilesMatcher);
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating IServiceTask namespace", ex);
        }
    }

    /// <summary>
    /// Rewrites the v8 eFormidling registration call to the v9 staged builder.
    /// </summary>
    static async Task<int> MigrateEFormidlingRegistration(CSharpSourceScanner scanner)
    {
        UpgradeConsole.BeginStep("eFormidling registration");
        try
        {
            var result = new EFormidlingRegistrationMigration(scanner).Migrate();
            return ReportMigrationResult(
                result,
                cleanText: "No v8 eFormidling registration in use",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error migrating the eFormidling registration", ex);
        }
    }

    /// <summary>
    /// Adds the new <c>receiverFromConfig</c> parameter to app implementations of
    /// <c>IEFormidlingReceivers.GetEFormidlingReceivers</c> so they satisfy the v9 interface.
    /// </summary>
    static async Task<int> MigrateEFormidlingReceiversSignature(CSharpSourceScanner scanner, string projectFile)
    {
        UpgradeConsole.BeginStep("IEFormidlingReceivers signature");
        try
        {
            var migration = new EFormidlingReceiversSignatureMigration(
                scanner,
                EFormidlingReceiversSignatureMigration.ProjectEnablesNullableAnnotations(projectFile)
            );
            var result = migration.Migrate();
            return ReportMigrationResult(
                result,
                cleanText: "No IEFormidlingReceivers implementations to update",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error migrating IEFormidlingReceivers signature", ex);
        }
    }

    /// <summary>
    /// Rewrites the Correspondence v9 breaks that have a mechanical, semantics-preserving fix. Runs before
    /// <see cref="CheckRemovedCSharpApis"/> so that whatever it cannot rewrite is reported there instead.
    /// </summary>
    static async Task<int> MigrateCorrespondenceApis(CSharpSourceScanner scanner)
    {
        UpgradeConsole.BeginStep("Correspondence APIs");
        try
        {
            var result = new CorrespondenceApiMigration(scanner).Migrate();

            // Unlike the other auto-fixes, this one can leave work behind: a `WithData` argument whose type
            // cannot be determined from syntax is reported rather than rewritten, and the app will not
            // build until it is resolved.
            return ReportMigrationResult(
                result,
                cleanText: "No removed Correspondence APIs in use",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error migrating Correspondence APIs", ex);
        }
    }

    /// <summary>
    /// Rewrites the mechanical PlatformHttpException breaks. Runs before <see cref="CheckRemovedCSharpApis"/>
    /// so the uses it cannot rewrite are reported there instead.
    /// </summary>
    static async Task<int> MigratePlatformHttpExceptionApis(CSharpSourceScanner scanner)
    {
        UpgradeConsole.BeginStep("PlatformHttpException APIs");
        try
        {
            var result = new PlatformHttpExceptionApiMigration(scanner).Migrate();
            return ReportMigrationResult(
                result,
                cleanText: "No changed PlatformHttpException APIs in use",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error migrating PlatformHttpException APIs", ex);
        }
    }

    /// <summary>
    /// Renames the misspelled public C# API names that v9 corrected to US English (the
    /// OrganisationNumber and IFileAnalyser families, InstansiationInstance, and friends). Compile-time
    /// names only; the wire spellings are pinned in the SDK and no string literal is touched.
    /// </summary>
    static async Task<int> MigrateMisspelledApis(CSharpSourceScanner scanner)
    {
        UpgradeConsole.BeginStep("Misspelled APIs");
        try
        {
            var result = new MisspelledApiMigration(scanner).Migrate();
            return ReportMigrationResult(
                result,
                cleanText: "No renamed SDK API spellings in use",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error migrating misspelled APIs", ex);
        }
    }

    /// <summary>
    /// Rewrites usings of the misspelled v8 <c>Features.FileAnalyzis</c> namespace. Runs after
    /// <see cref="MigrateMisspelledApis"/>, which leaves those using directives alone precisely so this
    /// step can merge them with an existing using of the correctly spelled sibling namespace.
    /// </summary>
    static async Task<int> MigrateFileAnalysisNamespace(CSharpSourceScanner scanner)
    {
        UpgradeConsole.BeginStep("FileAnalysis namespace");
        try
        {
            var migration = new UsingNamespaceMigration(scanner);
            migration.Migrate(
                "Altinn.App.Core.Features.FileAnalyzis",
                "Altinn.App.Core.Features.FileAnalysis",
                _allCSharpFilesMatcher
            );
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating FileAnalysis namespace", ex);
        }
    }

    /// <summary>
    /// Reports (never rewrites) app usages of removed/changed v9 C# APIs that require human judgment:
    /// the removed process task event interfaces, the reworked ServiceTaskResult API, legacy eFormidling
    /// code, removed internal engine handler types, and the deprecated Correspondence surfaces.
    /// </summary>
    /// <remarks>
    /// Internal so the view wiring below is pinned by tests: getting it wrong is either the critical
    /// silent-blindness bug (semantic detectors on the rewritten live view) or self-contradicting
    /// output (syntax detectors on the pristine view re-reporting what a rewriter just fixed).
    /// </remarks>
    internal static async Task<int> CheckRemovedCSharpApis(CSharpSourceScanner scanner, string projectFile)
    {
        UpgradeConsole.BeginStep("Removed v9 C# APIs");
        try
        {
            // The semantic-aware detectors bind against the pristine pre-rewrite view - the v8
            // compilation cannot bind names the rewriters already moved toward v9. The syntax-only
            // detectors read the live (rewritten) view, preserving their contract with the rewriters:
            // a usage is either fixed there or reported here, never both.
            var pristineView = scanner.PristineView;

            var result = WarnOnlyDetector.Combine(
                new RemovedTaskEventInterfaceDetector(scanner).Detect(),
                new RemovedEventsReceiveStackDetector(scanner).Detect(),
                new ServiceTaskResultApiDetector(pristineView).Detect(),
                new LegacyEFormidlingCodeDetector(pristineView).Detect(),
                new RemovedInternalProcessTypeDetector(scanner).Detect(),
                new LegacyCorrespondenceCodeDetector(scanner).Detect(),
                new PlatformHttpExceptionApiDetector(scanner).Detect(),
                new RemovedMaskinportenShimDetector(scanner).Detect(),
                new ExternalMaskinportenPackageDetector(scanner, projectFile).Detect(),
                new MaskinportenClientOverrideDetector(scanner).Detect()
            );

            return ReportMigrationResult(
                result,
                cleanText: "No removed or changed v9 C# APIs in use",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error checking for removed C# APIs", ex);
        }
    }

    static async Task<int> MigrateLaunchSettings(string projectFile)
    {
        UpgradeConsole.BeginStep("Launch settings");
        try
        {
            if (await LaunchSettingsMigration.Migrate(projectFile))
            {
                UpgradeConsole.Ok("Launch settings migrated");
            }
            else
            {
                UpgradeConsole.Skip("Launch settings already up to date");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating launch settings", ex);
        }
    }

    /// <summary>
    /// Reports (never rewrites) an app-owned <c>MaskinportenSettings</c> configuration section clashing
    /// with the one Studio provisions for the built-in client. Reads configuration rather than C#, so it
    /// runs separately from <see cref="CheckRemovedCSharpApis"/>.
    /// </summary>
    static async Task<int> CheckMaskinportenSettingsCollision(string projectFolder)
    {
        UpgradeConsole.BeginStep("Maskinporten settings");
        try
        {
            var result = new MaskinportenSettingsCollisionDetector(projectFolder).Detect();
            return ReportMigrationResult(
                result,
                cleanText: "No conflicting MaskinportenSettings configuration found",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error checking the Maskinporten configuration", ex);
        }
    }

    static async Task<int> MigrateOrganizationLookupLayouts(string projectFolder)
    {
        UpgradeConsole.BeginStep("OrganisationLookup components");
        try
        {
            return await OrganizationLookupLayoutMigration.Migrate(projectFolder);
        }
        catch (Exception ex)
        {
            return Fail("Error migrating OrganisationLookup components", ex);
        }
    }

    static async Task<int> MigrateCamelCaseLayoutProperties(string projectFolder)
    {
        UpgradeConsole.BeginStep("CamelCase layout properties");
        try
        {
            return await CamelCaseLayoutPropertyMigration.Migrate(projectFolder);
        }
        catch (Exception ex)
        {
            return Fail("Error migrating camelCase layout properties", ex);
        }
    }

    static async Task<int> MigrateDatepickerTimeStamp(string projectFolder)
    {
        UpgradeConsole.BeginStep("Datepicker timeStamp");
        try
        {
            var result = await new DatepickerTimeStampMigrator(projectFolder).Migrate();
            if (result.PropertiesAdded == 0)
            {
                UpgradeConsole.Skip("No Datepicker components omit timeStamp");
            }
            else
            {
                UpgradeConsole.Ok(
                    $"Added {result.PropertiesAdded} timeStamp flag(s) across {result.FilesChanged} layout file(s)"
                );
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating Datepicker timeStamp defaults", ex);
        }
    }

    /// <summary>
    /// Rewrites the renamed datepicker text-resource keys in app-owned resource.*.json overrides,
    /// so a customized validation message keeps applying after the v9 key rename.
    /// </summary>
    static async Task<int> MigrateDatepickerTextResourceKeys(string projectFolder)
    {
        UpgradeConsole.BeginStep("Datepicker text keys");
        try
        {
            return await DatepickerTextResourceKeyMigration.Migrate(projectFolder);
        }
        catch (Exception ex)
        {
            return Fail("Error migrating Datepicker text-resource keys", ex);
        }
    }

    static async Task<int> MigrateHeadingLayouts(string projectFolder)
    {
        UpgradeConsole.BeginStep("Header components");
        try
        {
            return await HeadingLayoutMigration.Migrate(projectFolder);
        }
        catch (Exception ex)
        {
            return Fail("Error migrating Header components to Heading", ex);
        }
    }

    static async Task<int> MigrateFileUploadWithTagLayouts(string projectFolder)
    {
        UpgradeConsole.BeginStep("FileUploadWithTag components");
        try
        {
            return await FileUploadWithTagLayoutMigration.Migrate(projectFolder);
        }
        catch (Exception ex)
        {
            return Fail("Error migrating FileUploadWithTag components to FileUpload", ex);
        }
    }

    static async Task<int> MigrateDatepickerFormats(string projectFolder)
    {
        UpgradeConsole.BeginStep("Datepicker formats");
        try
        {
            return await DatepickerFormatMigration.Migrate(projectFolder);
        }
        catch (Exception ex)
        {
            return Fail("Error migrating legacy Datepicker format values", ex);
        }
    }

    static async Task<int> MigrateGridXlSettings(string projectFolder)
    {
        UpgradeConsole.BeginStep("Component grid xl settings");
        try
        {
            var result = await GridXlMigration.Migrate(projectFolder);
            if (result.PropertiesRemoved == 0)
            {
                UpgradeConsole.Skip("No component grid xl settings found");
                return ExitSuccess;
            }

            UpgradeConsole.Ok(
                $"Removed {result.PropertiesRemoved} unsupported xl grid setting(s) from {result.FilesChanged} layout file(s)"
            );

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error removing component grid xl settings", ex);
        }
    }

    static async Task<int> ConvertToProjectReferences(
        string projectFolder,
        string projectFile,
        string targetFramework,
        string? studioRoot
    )
    {
        UpgradeConsole.BeginStep("Project references");
        try
        {
            if (string.IsNullOrWhiteSpace(studioRoot))
                return Fail("studioRoot is required when convertPackageReferences is enabled");

            studioRoot = Path.GetFullPath(studioRoot);
            if (!Directory.Exists(Path.Combine(studioRoot, "src", "App")))
                return Fail($"studioRoot does not contain src/App: {studioRoot}");

            if (IsSubPathOf(studioRoot, projectFolder))
            {
                var rewriter = new ProjectFileRewriter(projectFile, targetFramework: targetFramework);
                await rewriter.ConvertToProjectReferences(studioRoot);
                UpgradeConsole.Ok($"Altinn.App package references replaced with project references into {studioRoot}");
                return ExitSuccess;
            }

            return Fail("convertPackageReferences is only valid for apps inside the Altinn Studio repo root");
        }
        catch (Exception ex)
        {
            return Fail("Error converting to project references", ex);
        }
    }

    static bool IsSubPathOf(string parentPath, string childPath)
    {
        var relative = Path.GetRelativePath(parentPath, childPath);
        return relative == "."
            || (!relative.StartsWith("..", StringComparison.Ordinal) && !Path.IsPathRooted(relative));
    }

    /// <summary>
    /// Job 3: Convert conditional rendering rules to layout hidden expressions
    /// </summary>
    static async Task<int> ConvertConditionalRenderingRules(string projectFolder)
    {
        UpgradeConsole.BeginStep("Conditional rendering rules");
        try
        {
            var converter = new ConditionalRenderingConverter(projectFolder);
            var stats = converter.ConvertAllLayoutSets();
            if (stats.TotalRules == 0)
            {
                UpgradeConsole.Skip("No conditional rendering rules found to convert");
            }
            else
            {
                UpgradeConsole.Ok($"Converted {stats.TotalRules} rule(s) to layout hidden expressions");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error converting conditional rendering rules", ex);
        }
    }

    /// <summary>
    /// Job 4: Generate data processors for data processing rules
    /// </summary>
    static async Task<int> GenerateDataProcessors(string projectFolder)
    {
        UpgradeConsole.BeginStep("Data processors");
        try
        {
            var uiPath = Path.Combine(projectFolder, "App", "ui");
            if (!Directory.Exists(uiPath))
            {
                uiPath = Path.Combine(projectFolder, "ui");
                if (!Directory.Exists(uiPath))
                {
                    UpgradeConsole.Skip("No UI directory found, skipping data processor generation");
                    return ExitSuccess;
                }
            }

            var layoutSetDirectories = Directory.GetDirectories(uiPath);
            var totalProcessed = 0;
            var generationFailed = false;

            foreach (var layoutSetPath in layoutSetDirectories)
            {
                var layoutSetName = Path.GetFileName(layoutSetPath);
                var ruleConfigPath = Path.Combine(layoutSetPath, "RuleConfiguration.json");

                if (!File.Exists(ruleConfigPath))
                {
                    continue;
                }

                // Parse rule configuration
                var configParser = new RuleConfigurationParser(ruleConfigPath);
                configParser.Parse();
                var dataProcessingRules = configParser.GetDataProcessingRules();

                if (dataProcessingRules.Count == 0)
                {
                    continue;
                }

                // Parse JavaScript handler
                var ruleHandlerPath = Path.Combine(layoutSetPath, "RuleHandler.js");
                if (!File.Exists(ruleHandlerPath))
                {
                    UpgradeConsole.Warning(
                        $"RuleHandler.js not found for layout set '{layoutSetName}', skipping data processor generation"
                    );
                    continue;
                }

                var jsParser = new RuleHandlerParser(ruleHandlerPath);
                jsParser.Parse();

                // Resolve data model
                var dataModelResolver = new DataModelResolver(projectFolder);
                dataModelResolver.LoadConfiguration();
                var dataModelInfo = dataModelResolver.GetDataModelInfo(layoutSetName);

                if (dataModelInfo == null)
                {
                    UpgradeConsole.Warning(
                        $"Could not resolve data model for layout set '{layoutSetName}', skipping data processor generation"
                    );
                    continue;
                }

                // Initialize type resolver
                var typeResolver = new DataModelTypeResolver(projectFolder);
                var typeResolverLoaded = typeResolver.LoadDataModelType(dataModelInfo);

                // Generate C# code
                var generator = new CSharpCodeGenerator(
                    layoutSetName,
                    dataModelInfo,
                    dataProcessingRules,
                    jsParser,
                    typeResolverLoaded ? typeResolver : null
                );
                var generationResult = generator.Generate();

                if (
                    !generationResult.Success
                    || generationResult.GeneratedCode == null
                    || generationResult.ClassName == null
                )
                {
                    UpgradeConsole.Failed($"Failed to generate data processor for layout set '{layoutSetName}'");
                    foreach (var error in generationResult.Errors)
                    {
                        UpgradeConsole.Failed(error);
                    }

                    generationFailed = true;
                    continue;
                }

                // Write the file
                var fileWriter = new DataProcessorFileWriter(projectFolder);
                var filePath = fileWriter.WriteDataProcessor(
                    generationResult.ClassName,
                    generationResult.GeneratedCode
                );
                UpgradeConsole.Ok($"Generated data processor: {filePath}");

                // Register in Program.cs
                var programUpdater = new ProgramCsUpdater(projectFolder);
                programUpdater.RegisterDataProcessor(generationResult.ClassName);

                if (generationResult.FailedConversions > 0)
                {
                    UpgradeConsole.Warning(
                        $"{generationResult.FailedConversions} of {generationResult.TotalRules} rules failed to convert to C# code"
                    );
                }

                totalProcessed++;
            }

            if (totalProcessed == 0 && !generationFailed)
            {
                UpgradeConsole.Skip("No data processing rules found to convert");
            }

            return generationFailed ? ExitError : ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error generating data processors", ex);
        }
    }

    /// <summary>
    /// Job 5: Cleanup legacy rule files after conversion
    /// </summary>
    static async Task<int> CleanupLegacyRuleFiles(string projectFolder)
    {
        UpgradeConsole.BeginStep("Legacy rule files");
        try
        {
            var cleanup = new LegacyRuleFileCleanup(projectFolder);
            var stats = cleanup.CleanupAllLayoutSets();

            if (stats.RuleConfigFilesDeleted == 0 && stats.RuleHandlerFilesDeleted == 0)
            {
                UpgradeConsole.Skip("No legacy rule files found to cleanup");
                return ExitSuccess;
            }

            UpgradeConsole.Ok($"Deleted {stats.RuleConfigFilesDeleted} RuleConfiguration.json files");
            UpgradeConsole.Ok($"Deleted {stats.RuleHandlerFilesDeleted} RuleHandler.js files");

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error cleaning up legacy rule files", ex);
        }
    }

    /// <summary>
    /// Job 6: Migrate layout-sets.json to task-folder based UI settings
    /// </summary>
    static async Task<int> MigrateLayoutSetsToTaskUi(string projectFolder)
    {
        UpgradeConsole.BeginStep("Task-folder UI settings");
        try
        {
            var migrator = new LayoutSetsToTaskUiMigrator(projectFolder);
            var result = migrator.Migrate();

            if (!result.LayoutSetsDeleted)
            {
                UpgradeConsole.Skip("No layout-sets.json found, skipping migration");
                return ExitSuccess;
            }

            foreach (var todo in result.Todos)
            {
                UpgradeConsole.Todo(todo);
            }

            UpgradeConsole.Ok($"Migrated {result.MigratedFolderCount} UI folder(s)");
            UpgradeConsole.Ok(
                $"Folder operations: {result.RenamedFolderCount} renamed, {result.CopiedFolderCount} copied, {result.DeletedSourceFolderCount} deleted source folder(s)"
            );
            if (result.MigratedGlobalSettings)
            {
                UpgradeConsole.Ok("Migrated global uiSettings to App/ui/Settings.json");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating layout-sets.json", ex);
        }
    }

    static async Task<int> MigrateNavigationButtons(string projectFolder)
    {
        UpgradeConsole.BeginStep("NavigationButtons showBackButton");
        try
        {
            var result = await new ShowBackButtonMigrator(projectFolder).Migrate();
            if (result.PropertiesRemoved == 0)
            {
                UpgradeConsole.Skip("No redundant showBackButton flags found");
            }
            else
            {
                UpgradeConsole.Ok(
                    $"Removed {result.PropertiesRemoved} showBackButton flag(s) from {result.FilesChanged} layout file(s)"
                );
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating NavigationButtons showBackButton flags", ex);
        }
    }

    /// <summary>
    /// Converts the option/data list layout properties v9 removed - <c>mapping</c> and
    /// <c>bindingToShowInSummary</c> - to <c>queryParameters</c> and <c>summaryBinding</c>.
    /// </summary>
    static async Task<int> MigrateDeprecatedLayoutProperties(string projectFolder)
    {
        UpgradeConsole.BeginStep("Removed layout properties");
        try
        {
            var result = await new DeprecatedLayoutPropertiesMigrator(projectFolder).Migrate();
            foreach (var warning in result.Warnings)
            {
                UpgradeConsole.Warning(warning);
            }

            if (result.QueryParametersConverted > 0)
            {
                UpgradeConsole.Ok(
                    $"Converted {result.QueryParametersConverted} mapping entry/entries to queryParameters"
                );
            }

            if (result.SummaryBindingsConverted > 0)
            {
                UpgradeConsole.Ok(
                    $"Replaced {result.SummaryBindingsConverted} bindingToShowInSummary property/properties with summaryBinding"
                );
            }

            if (result.FilesChanged == 0 && result.Warnings.Count == 0)
            {
                UpgradeConsole.Skip("No mapping or bindingToShowInSummary properties found");
            }

            if (result.ManualActionRequired)
            {
                UpgradeConsole.Todo(
                    "Some layout properties removed in v9 could not be converted automatically. Review the messages above."
                );
                return ExitManualActionRequired;
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return Fail("Error migrating layout properties removed in v9", ex);
        }
    }

    /// <summary>
    /// Job 7: Migrate Index.cshtml to assets.json configuration
    /// </summary>
    static async Task<int> MigrateIndexCshtml(string projectFolder)
    {
        UpgradeConsole.BeginStep("Index.cshtml");
        try
        {
            var migrator = new IndexCshtmlMigrator(projectFolder);
            return await migrator.Migrate();
        }
        catch (Exception ex)
        {
            return Fail("Error migrating Index.cshtml", ex);
        }
    }

    /// <summary>
    /// Job 8: Migrate the deprecated enablePdfCreation flag to 'pdf' service tasks
    /// </summary>
    static async Task<int> MigratePdfServiceTasks(string projectFolder)
    {
        UpgradeConsole.BeginStep("PDF service tasks");
        try
        {
            var migrator = new PdfServiceTaskMigration.PdfServiceTaskMigrator(projectFolder);
            var result = await migrator.Migrate();
            // Phrased as an end state, not an action: this migrator reports no warnings both when it
            // migrated cleanly and when there was nothing to migrate, and MigrationResult cannot tell the
            // two apart.
            return ReportMigrationResult(result, cleanText: "No enablePdfCreation flags remain");
        }
        catch (Exception ex)
        {
            return Fail("Error migrating PDF service tasks", ex);
        }
    }

    /// <summary>
    /// Job 9: Ensure the policy grants the service owner the process-transition rights the v9 workflow
    /// engine needs (it persists transitions to Storage out-of-band as the service owner)
    /// </summary>
    static async Task<int> MigrateServiceOwnerPolicy(string projectFolder)
    {
        UpgradeConsole.BeginStep("Service-owner policy");
        try
        {
            var migrator = new PolicyMigration.ServiceOwnerPolicyMigrator(projectFolder);
            var result = await migrator.Migrate();
            return ReportMigrationResult(
                result,
                cleanText: "policy.xml already grants the service owner the required process-transition rights"
            );
        }
        catch (Exception ex)
        {
            return Fail("Error migrating service-owner policy", ex);
        }
    }

    /// <summary>
    /// Job 10: Migrate the deprecated eFormidling block in applicationmetadata.json to an eFormidling
    /// process service task
    /// </summary>
    static async Task<int> MigrateEFormidlingServiceTasks(string projectFolder)
    {
        UpgradeConsole.BeginStep("eFormidling service tasks");
        try
        {
            var migrator = new EFormidlingServiceTaskMigration.EFormidlingServiceTaskMigrator(projectFolder);
            var result = await migrator.Migrate();
            return ReportMigrationResult(result, cleanText: "No legacy eFormidling configuration remains");
        }
        catch (Exception ex)
        {
            return Fail("Error migrating eFormidling service tasks", ex);
        }
    }

    /// <summary>
    /// Job 11: warn about feedback tasks sitting behind service tasks - a v8 waiting pattern the v9
    /// implicit waiting step makes redundant. Advisory only (never rewrites the process); runs after
    /// the PDF/eFormidling migrations so service tasks they insert are included in the analysis.
    /// </summary>
    static async Task<int> WarnFeedbackTasksBehindServiceTasks(string projectFolder)
    {
        UpgradeConsole.BeginStep("Feedback tasks behind service tasks");
        try
        {
            var advisor = new ProcessAdvisories.FeedbackAfterServiceTaskAdvisor(projectFolder);
            var result = advisor.Analyze();
            return ReportMigrationResult(
                result,
                cleanText: "No feedback tasks behind service tasks found",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return Fail("Error checking for feedback tasks behind service tasks", ex);
        }
    }

    // Process exit codes. A job that completes but leaves work for a human (e.g. a legacy flag kept in
    // place) reports ManualActionRequired so tooling can tell "clean" from "needs manual follow-up".
    private const int ExitSuccess = 0;
    private const int ExitError = 1;
    private const int ExitUnsupportedVersion = 2;
    private const int ExitManualActionRequired = 3;

    /// <summary>
    /// Whether an exit code reports a hard error. Any non-zero that isn't the manual-action signal counts
    /// as one, so an unexpected/future non-zero code can never be swallowed into success.
    /// </summary>
    public static bool IsError(int code) => code != ExitSuccess && code != ExitManualActionRequired;

    /// <summary>
    /// Aggregates two job exit codes by severity: a genuine error must never be masked by a
    /// manual-action or success result, and manual-action outranks success. (Numeric order does not
    /// track severity, so this cannot be a plain <see cref="Math.Max(int,int)"/>.)
    /// </summary>
    private static int CombineExitCodes(int current, int next)
    {
        if (IsError(current) || IsError(next))
            return ExitError;
        if (current == ExitManualActionRequired || next == ExitManualActionRequired)
            return ExitManualActionRequired;
        return ExitSuccess;
    }

    private static int WriteError(string message, int exitCode = ExitError)
    {
        UpgradeConsole.WriteErrorLine(message);
        return exitCode;
    }
}
