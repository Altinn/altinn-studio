using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade.ProjectFile;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.IndexMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov9.LayoutSetsMigration;
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
    CancellationToken CancellationToken
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
        using var outputScope = UpgradeResultWriter.Use(options.Report, options.Error);
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
        returnCode = CombineExitCodes(returnCode, await MigrateOpenApiNamespace(projectFile));

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
        returnCode = CombineExitCodes(returnCode, await MigrateServiceTaskNamespace(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateEFormidlingReceiversSignature(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateCorrespondenceApis(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await CheckRemovedCSharpApis(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateLaunchSettings(projectFile));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateOrganizationLookupLayouts(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await ConvertConditionalRenderingRules(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await GenerateDataProcessors(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await CleanupLegacyRuleFiles(projectFolder));

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateLayoutSetsToTaskUi(projectFolder));

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

        // No closing verdict here: the CLI writes it, keyed off this return code, so that the sentence
        // sits below the rendered report rather than inside it.
        return returnCode;
    }

    /// <summary>
    /// Reports a migrator's result on the current step and maps it to an exit code. Warnings are reported as
    /// manual follow-up when the migrator left work for a human, and as plain warnings otherwise; a clean
    /// run reports a single <paramref name="cleanText"/> with <paramref name="cleanStatus"/> - Skip for a
    /// check that found nothing to act on, Ok (the default) for a migration that applied.
    /// </summary>
    /// <remarks>
    /// Consumes <see cref="MigrationResult.Warnings"/> verbatim - the migrators and their warning strings
    /// are deliberately untouched by the structured output.
    /// </remarks>
    private static int ReportMigrationResult(
        MigrationResult result,
        string cleanText,
        UpgradeMessageStatus cleanStatus = UpgradeMessageStatus.Ok
    )
    {
        var status = result.ManualActionRequired ? UpgradeMessageStatus.Todo : UpgradeMessageStatus.Warning;
        foreach (var warning in result.Warnings)
        {
            UpgradeResultWriter.Message(status, warning);
        }

        if (result.ManualActionRequired)
            return ExitManualActionRequired;

        if (result.Warnings.Count == 0)
            UpgradeResultWriter.Message(cleanStatus, cleanText);

        return ExitSuccess;
    }

    /// <summary>
    /// Reports a failure that is not an exception - a precondition the caller cannot satisfy. Same
    /// channels as <see cref="ReportFailure"/>.
    /// </summary>
    private static async Task<int> FailStep(string message)
    {
        UpgradeResultWriter.Failed(message);
        await UpgradeResultWriter.Error.WriteLineAsync(message);
        return ExitError;
    }

    /// <summary>
    /// Reports that a job failed, and returns its exit code. The current step gets the cause so the
    /// rendered report shows which job failed; <paramref name="description"/> still goes to the error
    /// channel, and so to stderr, exactly as before.
    /// </summary>
    private static async Task<int> ReportFailure(string description, Exception exception)
    {
        UpgradeResultWriter.Failed(FileAccessDiagnostics.Describe(exception));
        await UpgradeResultWriter.WriteErrorAsync(description, exception);
        return ExitError;
    }

    static async Task<int> UpgradeProjectFile(string projectFile, string targetVersion, string targetFramework)
    {
        UpgradeResultWriter.BeginStep("Project file");
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile, targetVersion, targetFramework);
            await rewriter.Upgrade();
            UpgradeResultWriter.Ok($"Altinn.App packages set to {targetVersion}, target framework {targetFramework}");
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error upgrading project file", ex);
        }
    }

    static async Task<int> MigrateDockerfile(string projectFolder, string targetFramework)
    {
        UpgradeResultWriter.BeginStep("Dockerfile");
        try
        {
            await DockerfileMigration.Migrate(projectFolder, targetFramework);
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating Dockerfile", ex);
        }
    }

    static async Task<int> RemoveSwashbucklePackage(string projectFile)
    {
        UpgradeResultWriter.BeginStep("Swashbuckle package");
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile);
            if (await rewriter.RemovePackageReference("Swashbuckle.AspNetCore"))
            {
                UpgradeResultWriter.Ok("Swashbuckle.AspNetCore package reference removed");
            }
            else
            {
                UpgradeResultWriter.Skip("No Swashbuckle.AspNetCore package reference");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error removing Swashbuckle.AspNetCore package reference", ex);
        }
    }

    static async Task<int> MigrateOpenApiNamespace(string projectFile)
    {
        UpgradeResultWriter.BeginStep("OpenAPI namespace");
        try
        {
            var migration = new UsingNamespaceMigration(projectFile);
            migration.Migrate("Microsoft.OpenApi.Models", "Microsoft.OpenApi", _programCsPathMatcher);
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating OpenAPI namespace in Program.cs", ex);
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
        UpgradeResultWriter.BeginStep("NuGet downgrades");
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
            return await ReportFailure("Error resolving package downgrades", ex);
        }
    }

    /// <summary>Rewrites the IServiceTask namespace usings across all app C# files.</summary>
    static async Task<int> MigrateServiceTaskNamespace(string projectFile)
    {
        UpgradeResultWriter.BeginStep("IServiceTask namespace");
        try
        {
            var migration = new UsingNamespaceMigration(projectFile);
            migration.Migrate(ServiceTaskOldNamespace, ServiceTaskNewNamespace, _allCSharpFilesMatcher);
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating IServiceTask namespace", ex);
        }
    }

    /// <summary>
    /// Adds the new <c>receiverFromConfig</c> parameter to app implementations of
    /// <c>IEFormidlingReceivers.GetEFormidlingReceivers</c> so they satisfy the v9 interface.
    /// </summary>
    static async Task<int> MigrateEFormidlingReceiversSignature(string projectFile)
    {
        UpgradeResultWriter.BeginStep("IEFormidlingReceivers signature");
        try
        {
            var scanner = CSharpSourceScanner.ForProject(projectFile);
            var migration = new EFormidlingReceiversSignatureMigration(
                scanner,
                EFormidlingReceiversSignatureMigration.ProjectEnablesNullableAnnotations(projectFile)
            );
            var result = migration.Migrate();

            foreach (var warning in result.Warnings)
            {
                UpgradeResultWriter.Warning(warning);
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating IEFormidlingReceivers signature", ex);
        }
    }

    /// <summary>
    /// Reports (never rewrites) app usages of removed/changed v9 C# APIs that require human judgement:
    /// the removed process task event interfaces, the reworked ServiceTaskResult API, legacy eFormidling
    /// code, removed internal engine handler types, and the deprecated Correspondence surfaces.
    /// </summary>
    /// <summary>
    /// Rewrites the Correspondence v9 breaks that have a mechanical, semantics-preserving fix. Runs before
    /// <see cref="CheckRemovedCSharpApis"/> so that whatever it cannot rewrite is reported there instead.
    /// </summary>
    static async Task<int> MigrateCorrespondenceApis(string projectFile)
    {
        UpgradeResultWriter.BeginStep("Correspondence APIs");
        try
        {
            var scanner = CSharpSourceScanner.ForProject(projectFile);
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
            return await ReportFailure("Error migrating Correspondence APIs", ex);
        }
    }

    static async Task<int> CheckRemovedCSharpApis(string projectFile)
    {
        UpgradeResultWriter.BeginStep("Removed v9 C# APIs");
        try
        {
            var scanner = CSharpSourceScanner.ForProject(projectFile);
            var result = WarnOnlyDetector.Combine(
                new RemovedTaskEventInterfaceDetector(scanner).Detect(),
                new ServiceTaskResultApiDetector(scanner).Detect(),
                new LegacyEFormidlingCodeDetector(scanner).Detect(),
                new RemovedInternalProcessTypeDetector(scanner).Detect(),
                new LegacyCorrespondenceCodeDetector(scanner).Detect()
            );

            return ReportMigrationResult(
                result,
                cleanText: "No removed or changed v9 C# APIs in use",
                cleanStatus: UpgradeMessageStatus.Skip
            );
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error checking for removed C# APIs", ex);
        }
    }

    static async Task<int> MigrateLaunchSettings(string projectFile)
    {
        UpgradeResultWriter.BeginStep("Launch settings");
        try
        {
            if (await LaunchSettingsMigration.Migrate(projectFile))
            {
                UpgradeResultWriter.Ok("Launch settings migrated");
            }
            else
            {
                UpgradeResultWriter.Skip("Launch settings already up to date");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating launch settings", ex);
        }
    }

    static async Task<int> MigrateOrganizationLookupLayouts(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("OrganisationLookup components");
        try
        {
            return await OrganizationLookupLayoutMigration.Migrate(projectFolder);
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating OrganisationLookup components", ex);
        }
    }

    static async Task<int> ConvertToProjectReferences(
        string projectFolder,
        string projectFile,
        string targetFramework,
        string? studioRoot
    )
    {
        UpgradeResultWriter.BeginStep("Project references");
        try
        {
            if (string.IsNullOrWhiteSpace(studioRoot))
                return await FailStep("studioRoot is required when convertPackageReferences is enabled");

            studioRoot = Path.GetFullPath(studioRoot);
            if (!Directory.Exists(Path.Combine(studioRoot, "src", "App")))
                return await FailStep($"studioRoot does not contain src/App: {studioRoot}");

            if (!IsSubPathOf(studioRoot, projectFolder))
                return await FailStep(
                    "convertPackageReferences is only valid for apps inside the Altinn Studio repo root"
                );

            var rewriter = new ProjectFileRewriter(projectFile, targetFramework: targetFramework);
            await rewriter.ConvertToProjectReferences(studioRoot);
            UpgradeResultWriter.Ok($"Altinn.App package references replaced with project references into {studioRoot}");
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error converting to project references", ex);
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
        UpgradeResultWriter.BeginStep("Conditional rendering rules");
        try
        {
            var converter = new ConditionalRenderingConverter(projectFolder);
            var stats = converter.ConvertAllLayoutSets();
            if (stats.TotalRules == 0)
            {
                UpgradeResultWriter.Skip("No conditional rendering rules found");
            }
            else
            {
                UpgradeResultWriter.Ok($"Converted {stats.TotalRules} rule(s) to layout hidden expressions");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error converting conditional rendering rules", ex);
        }
    }

    /// <summary>
    /// Job 4: Generate data processors for data processing rules
    /// </summary>
    static async Task<int> GenerateDataProcessors(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("Data processors");
        try
        {
            var uiPath = Path.Combine(projectFolder, "App", "ui");
            if (!Directory.Exists(uiPath))
            {
                uiPath = Path.Combine(projectFolder, "ui");
                if (!Directory.Exists(uiPath))
                {
                    UpgradeResultWriter.Skip("No UI directory found");
                    return ExitSuccess;
                }
            }

            var layoutSetDirectories = Directory.GetDirectories(uiPath);
            var totalProcessed = 0;

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
                    UpgradeResultWriter.Warning(
                        $"RuleHandler.js not found for layout set '{layoutSetName}'; skipped its data processor"
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
                    UpgradeResultWriter.Warning(
                        $"Could not resolve the data model for layout set '{layoutSetName}'; skipped its data processor"
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
                    UpgradeResultWriter.Failed(
                        $"Could not generate the data processor for layout set '{layoutSetName}'"
                    );
                    foreach (var error in generationResult.Errors)
                    {
                        await UpgradeResultWriter.Error.WriteLineAsync(
                            $"Data processor for layout set '{layoutSetName}': {error}"
                        );
                    }
                    continue;
                }

                // Write the file
                var fileWriter = new DataProcessorFileWriter(projectFolder);
                var filePath = fileWriter.WriteDataProcessor(
                    generationResult.ClassName,
                    generationResult.GeneratedCode
                );
                UpgradeResultWriter.Ok($"Generated data processor: {filePath}");

                // Register in Program.cs
                var programUpdater = new ProgramCsUpdater(projectFolder);
                programUpdater.RegisterDataProcessor(generationResult.ClassName);

                if (generationResult.FailedConversions > 0)
                {
                    UpgradeResultWriter.Warning(
                        $"{generationResult.FailedConversions} of {generationResult.TotalRules} rules could not be converted to C# code"
                    );
                }

                totalProcessed++;
            }

            if (totalProcessed == 0)
            {
                UpgradeResultWriter.Skip("No data processing rules found");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error generating data processors", ex);
        }
    }

    /// <summary>
    /// Job 5: Cleanup legacy rule files after conversion
    /// </summary>
    static async Task<int> CleanupLegacyRuleFiles(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("Legacy rule files");
        try
        {
            var cleanup = new LegacyRuleFileCleanup(projectFolder);
            var stats = cleanup.CleanupAllLayoutSets();

            if (stats.RuleConfigFilesDeleted == 0 && stats.RuleHandlerFilesDeleted == 0)
            {
                UpgradeResultWriter.Skip("No legacy rule files found");
                return ExitSuccess;
            }

            UpgradeResultWriter.Ok(
                $"Deleted {stats.RuleConfigFilesDeleted} RuleConfiguration.json and "
                    + $"{stats.RuleHandlerFilesDeleted} RuleHandler.js file(s)"
            );

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error cleaning up legacy rule files", ex);
        }
    }

    /// <summary>
    /// Job 6: Migrate layout-sets.json to task-folder based UI settings
    /// </summary>
    static async Task<int> MigrateLayoutSetsToTaskUi(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("Task-folder UI settings");
        try
        {
            var migrator = new LayoutSetsToTaskUiMigrator(projectFolder);
            var result = migrator.Migrate();

            if (!result.LayoutSetsDeleted)
            {
                UpgradeResultWriter.Skip("No layout-sets.json found");
                return ExitSuccess;
            }

            UpgradeResultWriter.Ok(
                $"Migrated {result.MigratedFolderCount} UI folder(s) to task folders "
                    + $"({result.RenamedFolderCount} renamed, {result.CopiedFolderCount} copied, "
                    + $"{result.DeletedSourceFolderCount} deleted source folder(s))"
            );
            if (result.MigratedGlobalSettings)
            {
                UpgradeResultWriter.Ok("Migrated global uiSettings to App/ui/Settings.json");
            }

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating layout-sets.json", ex);
        }
    }

    /// <summary>
    /// Job 7: Migrate Index.cshtml to assets.json configuration
    /// </summary>
    static async Task<int> MigrateIndexCshtml(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("Index.cshtml");
        try
        {
            var migrator = new IndexCshtmlMigrator(projectFolder);
            return await migrator.Migrate();
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating Index.cshtml", ex);
        }
    }

    /// <summary>
    /// Job 8: Migrate the deprecated enablePdfCreation flag to 'pdf' service tasks
    /// </summary>
    static async Task<int> MigratePdfServiceTasks(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("PDF service tasks");
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
            return await ReportFailure("Error migrating PDF service tasks", ex);
        }
    }

    /// <summary>
    /// Job 9: Ensure the policy grants the service owner the process-transition rights the v9 workflow
    /// engine needs (it persists transitions to Storage out-of-band as the service owner)
    /// </summary>
    static async Task<int> MigrateServiceOwnerPolicy(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("Service-owner policy");
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
            return await ReportFailure("Error migrating service-owner policy", ex);
        }
    }

    /// <summary>
    /// Job 10: Migrate the deprecated eFormidling block in applicationmetadata.json to an eFormidling
    /// process service task
    /// </summary>
    static async Task<int> MigrateEFormidlingServiceTasks(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("eFormidling service tasks");
        try
        {
            var migrator = new EFormidlingServiceTaskMigration.EFormidlingServiceTaskMigrator(projectFolder);
            var result = await migrator.Migrate();
            // End state rather than action, for the same reason as the PDF migrator above.
            return ReportMigrationResult(result, cleanText: "No legacy eFormidling configuration remains");
        }
        catch (Exception ex)
        {
            return await ReportFailure("Error migrating eFormidling service tasks", ex);
        }
    }

    /// <summary>
    /// Job 11: warn about feedback tasks sitting behind service tasks - a v8 waiting pattern the v9
    /// implicit waiting step makes redundant. Advisory only (never rewrites the process); runs after
    /// the PDF/eFormidling migrations so service tasks they insert are included in the analysis.
    /// </summary>
    static async Task<int> WarnFeedbackTasksBehindServiceTasks(string projectFolder)
    {
        UpgradeResultWriter.BeginStep("Feedback tasks behind service tasks");
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
            return await ReportFailure("Error checking for feedback tasks behind service tasks", ex);
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
        UpgradeResultWriter.WriteErrorLine(message);
        return exitCode;
    }
}
