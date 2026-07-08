using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade.ProjectFile;
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
    TextWriter Output,
    TextWriter Error,
    CancellationToken CancellationToken
);

internal static class V8Tov9Upgrade
{
    private static readonly Regex _programCsPathMatcher = new(
        @"^Program\.cs$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    internal static async Task<int> RunAsync(V8Tov9UpgradeOptions options)
    {
        using var outputScope = UpgradeConsole.Use(options.Output, options.Error);
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

        options.CancellationToken.ThrowIfCancellationRequested();
        returnCode = CombineExitCodes(returnCode, await MigrateLaunchSettings(projectFile));

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

        UpgradeConsole.WriteLine(
            returnCode switch
            {
                ExitSuccess => "Please verify that the application is still working as expected.",
                ExitManualActionRequired =>
                    "Upgrade completed, but some steps need manual follow-up. Please review the warnings above.",
                _ => "Upgrade completed with errors. Please check for errors in the log above.",
            }
        );
        return returnCode;
    }

    static async Task<int> UpgradeProjectFile(string projectFile, string targetVersion, string targetFramework)
    {
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile, targetVersion, targetFramework);
            await rewriter.Upgrade();
            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error upgrading project file: {ex.Message}");
            return 1;
        }
    }

    static async Task<int> MigrateDockerfile(string projectFolder, string targetFramework)
    {
        try
        {
            await DockerfileMigration.Migrate(projectFolder, targetFramework);
            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error migrating Dockerfile: {ex.Message}");
            return 1;
        }
    }

    static async Task<int> RemoveSwashbucklePackage(string projectFile)
    {
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile);
            await rewriter.RemovePackageReference("Swashbuckle.AspNetCore");
            await UpgradeConsole.Out.WriteLineAsync("Swashbuckle.AspNetCore package reference removed");
            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync(
                $"Error removing Swashbuckle.AspNetCore package reference: {ex.Message}"
            );
            return 1;
        }
    }

    static async Task<int> MigrateOpenApiNamespace(string projectFile)
    {
        try
        {
            var migration = new UsingNamespaceMigration(projectFile);
            migration.Migrate("Microsoft.OpenApi.Models", "Microsoft.OpenApi", _programCsPathMatcher);
            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error migrating OpenAPI namespace in Program.cs: {ex.Message}");
            return 1;
        }
    }

    static async Task<int> MigrateLaunchSettings(string projectFile)
    {
        try
        {
            await LaunchSettingsMigration.Migrate(projectFile);
            await UpgradeConsole.Out.WriteLineAsync("Launch settings migrated");
            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error migrating launch settings: {ex.Message}");
            return 1;
        }
    }

    static async Task<int> ConvertToProjectReferences(
        string projectFolder,
        string projectFile,
        string targetFramework,
        string? studioRoot
    )
    {
        try
        {
            if (string.IsNullOrWhiteSpace(studioRoot))
            {
                await UpgradeConsole.Error.WriteLineAsync(
                    "studioRoot is required when convertPackageReferences is enabled"
                );
                return 1;
            }

            studioRoot = Path.GetFullPath(studioRoot);
            if (!Directory.Exists(Path.Combine(studioRoot, "src", "App")))
            {
                await UpgradeConsole.Error.WriteLineAsync($"studioRoot does not contain src/App: {studioRoot}");
                return 1;
            }

            if (IsSubPathOf(studioRoot, projectFolder))
            {
                var rewriter = new ProjectFileRewriter(projectFile, targetFramework: targetFramework);
                await rewriter.ConvertToProjectReferences(studioRoot);
                return 0;
            }

            await UpgradeConsole.Error.WriteLineAsync(
                "convertPackageReferences is only valid for apps inside the Altinn Studio repo root"
            );
            return 1;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error converting to project references: {ex.Message}");
            return 1;
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
        try
        {
            await UpgradeConsole.Out.WriteLineAsync(
                "Converting conditional rendering rules to layout hidden expressions..."
            );

            var converter = new ConditionalRenderingConverter(projectFolder);
            var stats = converter.ConvertAllLayoutSets();
            if (stats.TotalRules == 0)
            {
                await UpgradeConsole.Out.WriteLineAsync("No conditional rendering rules found to convert");
            }

            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error converting conditional rendering rules: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Job 4: Generate data processors for data processing rules
    /// </summary>
    static async Task<int> GenerateDataProcessors(string projectFolder)
    {
        try
        {
            await UpgradeConsole.Out.WriteLineAsync("Generating data processors for data processing rules...");

            var uiPath = Path.Combine(projectFolder, "App", "ui");
            if (!Directory.Exists(uiPath))
            {
                uiPath = Path.Combine(projectFolder, "ui");
                if (!Directory.Exists(uiPath))
                {
                    await UpgradeConsole.Out.WriteLineAsync(
                        "No UI directory found, skipping data processor generation"
                    );
                    return 0;
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
                    await UpgradeConsole.Error.WriteLineAsync(
                        $"Warning: RuleHandler.js not found for layout set '{layoutSetName}', skipping data processor generation"
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
                    await UpgradeConsole.Error.WriteLineAsync(
                        $"Warning: Could not resolve data model for layout set '{layoutSetName}', skipping data processor generation"
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
                    await UpgradeConsole.Error.WriteLineAsync(
                        $"Failed to generate data processor for layout set '{layoutSetName}'"
                    );
                    foreach (var error in generationResult.Errors)
                    {
                        await UpgradeConsole.Error.WriteLineAsync($"  Error: {error}");
                    }
                    continue;
                }

                // Write the file
                var fileWriter = new DataProcessorFileWriter(projectFolder);
                var filePath = fileWriter.WriteDataProcessor(
                    generationResult.ClassName,
                    generationResult.GeneratedCode
                );
                await UpgradeConsole.Out.WriteLineAsync($"Generated data processor: {filePath}");

                // Register in Program.cs
                var programUpdater = new ProgramCsUpdater(projectFolder);
                programUpdater.RegisterDataProcessor(generationResult.ClassName);

                if (generationResult.FailedConversions > 0)
                {
                    await UpgradeConsole.Out.WriteLineAsync(
                        $"  Warning: {generationResult.FailedConversions} of {generationResult.TotalRules} rules failed to convert to C# code"
                    );
                }

                totalProcessed++;
            }

            if (totalProcessed == 0)
            {
                await UpgradeConsole.Out.WriteLineAsync("No data processing rules found to convert");
            }

            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error generating data processors: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Job 5: Cleanup legacy rule files after conversion
    /// </summary>
    static async Task<int> CleanupLegacyRuleFiles(string projectFolder)
    {
        try
        {
            await UpgradeConsole.Out.WriteLineAsync("Cleaning up legacy rule files...");

            var cleanup = new LegacyRuleFileCleanup(projectFolder);
            var stats = cleanup.CleanupAllLayoutSets();

            if (stats.RuleConfigFilesDeleted == 0 && stats.RuleHandlerFilesDeleted == 0)
            {
                await UpgradeConsole.Out.WriteLineAsync("No legacy rule files found to cleanup");
                return 0;
            }

            await UpgradeConsole.Out.WriteLineAsync(
                $"Deleted {stats.RuleConfigFilesDeleted} RuleConfiguration.json files"
            );
            await UpgradeConsole.Out.WriteLineAsync($"Deleted {stats.RuleHandlerFilesDeleted} RuleHandler.js files");

            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error cleaning up legacy rule files: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Job 6: Migrate layout-sets.json to task-folder based UI settings
    /// </summary>
    static async Task<int> MigrateLayoutSetsToTaskUi(string projectFolder)
    {
        try
        {
            await UpgradeConsole.Out.WriteLineAsync("Migrating layout-sets.json to task-folder UI settings...");
            using var migrator = new LayoutSetsToTaskUiMigrator(projectFolder);
            var result = migrator.Migrate();

            if (!result.LayoutSetsDeleted)
            {
                await UpgradeConsole.Out.WriteLineAsync("No layout-sets.json found, skipping migration");
                return 0;
            }

            await UpgradeConsole.Out.WriteLineAsync($"Migrated {result.MigratedFolderCount} UI folder(s)");
            await UpgradeConsole.Out.WriteLineAsync(
                $"Folder operations: {result.RenamedFolderCount} renamed, {result.CopiedFolderCount} copied, {result.DeletedSourceFolderCount} deleted source folder(s)"
            );
            if (result.MigratedGlobalSettings)
            {
                await UpgradeConsole.Out.WriteLineAsync("Migrated global uiSettings to App/ui/Settings.json");
            }

            return 0;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error migrating layout-sets.json: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Job 7: Migrate Index.cshtml to assets.json configuration
    /// </summary>
    static async Task<int> MigrateIndexCshtml(string projectFolder)
    {
        try
        {
            var migrator = new IndexCshtmlMigrator(projectFolder);
            return await migrator.Migrate();
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error migrating Index.cshtml: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Job 8: Migrate the deprecated enablePdfCreation flag to 'pdf' service tasks
    /// </summary>
    static async Task<int> MigratePdfServiceTasks(string projectFolder)
    {
        try
        {
            await UpgradeConsole.Out.WriteLineAsync("Migrating enablePdfCreation to PDF service tasks...");

            var migrator = new PdfServiceTaskMigration.PdfServiceTaskMigrator(projectFolder);
            var result = await migrator.Migrate();

            foreach (var warning in result.Warnings)
            {
                await UpgradeConsole.Out.WriteLineAsync($"  Warning: {warning}");
            }

            if (result.ManualActionRequired)
            {
                await UpgradeConsole.Out.WriteLineAsync(
                    "PDF service task migration needs manual follow-up. Review the warnings above."
                );
                return ExitManualActionRequired;
            }

            await UpgradeConsole.Out.WriteLineAsync(
                result.Warnings.Count > 0
                    ? "PDF service task migration completed with warnings. Review the warnings above."
                    : "PDF service task migration completed"
            );

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error migrating PDF service tasks: {ex.Message}");
            return ExitError;
        }
    }

    /// <summary>
    /// Job 9: Ensure the policy grants the service owner the process-transition rights the v9 workflow
    /// engine needs (it persists transitions to Storage out-of-band as the service owner)
    /// </summary>
    static async Task<int> MigrateServiceOwnerPolicy(string projectFolder)
    {
        try
        {
            await UpgradeConsole.Out.WriteLineAsync(
                "Checking service-owner process-transition rights in policy.xml..."
            );

            var migrator = new PolicyMigration.ServiceOwnerPolicyMigrator(projectFolder);
            var result = await migrator.Migrate();

            foreach (var warning in result.Warnings)
            {
                await UpgradeConsole.Out.WriteLineAsync($"  Warning: {warning}");
            }

            if (result.ManualActionRequired)
            {
                await UpgradeConsole.Out.WriteLineAsync(
                    "Service-owner policy migration needs manual follow-up. Review the warnings above."
                );
                return ExitManualActionRequired;
            }

            await UpgradeConsole.Out.WriteLineAsync(
                result.Warnings.Count > 0
                    ? "Service-owner policy migration completed with warnings. Review the warnings above."
                    : "Service-owner policy migration completed (policy already covered the required actions)"
            );

            return ExitSuccess;
        }
        catch (Exception ex)
        {
            await UpgradeConsole.Error.WriteLineAsync($"Error migrating service-owner policy: {ex.Message}");
            return ExitError;
        }
    }

    // Process exit codes. A job that completes but leaves work for a human (e.g. a legacy flag kept in
    // place) reports ManualActionRequired so tooling can tell "clean" from "needs manual follow-up".
    private const int ExitSuccess = 0;
    private const int ExitError = 1;
    private const int ExitUnsupportedVersion = 2;
    private const int ExitManualActionRequired = 3;

    /// <summary>
    /// Aggregates two job exit codes by severity: a genuine error must never be masked by a
    /// manual-action or success result, and manual-action outranks success. (Numeric order does not
    /// track severity, so this cannot be a plain <see cref="Math.Max(int,int)"/>.)
    /// </summary>
    private static int CombineExitCodes(int current, int next)
    {
        // Any non-zero that isn't the manual-action signal counts as a hard error and dominates, so an
        // unexpected/future non-zero code can never be swallowed into success.
        static bool IsError(int code) => code != ExitSuccess && code != ExitManualActionRequired;
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
