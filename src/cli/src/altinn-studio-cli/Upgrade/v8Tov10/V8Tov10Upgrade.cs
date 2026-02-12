using System.CommandLine;
using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProjectRewriters;
using Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;
using Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration;
using Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;
using Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.DataProcessingRules;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10;

/// <summary>
/// Defines the upgrade command for upgrading both backend and frontend from v8 to v10
/// </summary>
internal static class V8Tov10Upgrade
{
    /// <summary>
    /// Get the v8Tov10 upgrade command
    /// </summary>
    /// <param name="projectFolderOption">Option for setting the root folder of the project</param>
    /// <returns>The command for upgrading from v8 to v10</returns>
    public static Command GetUpgradeCommand(Option<string> projectFolderOption)
    {
        var projectFileOption = new Option<string>("--project")
        {
            Description = "The project file to read relative to --folder",
            DefaultValueFactory = _ => "App/App.csproj",
        };
        var targetFrameworkOption = new Option<string>("--target-framework")
        {
            Description = "The target dotnet framework version to upgrade to",
            DefaultValueFactory = _ => "net8.0",
        };
        var skipCsprojUpgradeOption = new Option<bool>("--skip-csproj-upgrade")
        {
            Description = "Skip csproj file upgrade",
            DefaultValueFactory = _ => false,
        };

        var upgradeCommand = new Command("v10")
        {
            Description = "Upgrade an app from v8 to v10 (both backend and frontend)",
        };
        upgradeCommand.Add(projectFolderOption);
        upgradeCommand.Add(projectFileOption);
        upgradeCommand.Add(targetFrameworkOption);
        upgradeCommand.Add(skipCsprojUpgradeOption);

        int returnCode = 0;
        upgradeCommand.SetAction(
            async (parseResult) =>
            {
                var projectFolder = parseResult.GetValue(projectFolderOption);
                var projectFile = parseResult.GetValue(projectFileOption);
                var targetFramework = parseResult.GetValue(targetFrameworkOption);
                var skipCsprojUpgrade = parseResult.GetValue(skipCsprojUpgradeOption);

                if (projectFolder is null or "CurrentDirectory")
                    projectFolder = Directory.GetCurrentDirectory();

                if (projectFile is null)
                    ExitWithError("Project file option is required but was not provided");

                if (targetFramework is null)
                    ExitWithError("Target framework option is required but was not provided");

                if (!Directory.Exists(projectFolder))
                {
                    ExitWithError(
                        $"{projectFolder} does not exist. Please supply location of project with --folder [path/to/project]"
                    );
                }

                FileAttributes attr = File.GetAttributes(projectFolder);
                if ((attr & FileAttributes.Directory) != FileAttributes.Directory)
                {
                    ExitWithError(
                        $"Project folder {projectFolder} is a file. Please supply location of project with --folder [path/to/project]"
                    );
                }

                if (!Path.IsPathRooted(projectFolder))
                {
                    projectFile = Path.Combine(Directory.GetCurrentDirectory(), projectFolder, projectFile);
                }
                else
                {
                    projectFile = Path.Combine(projectFolder, projectFile);
                }

                if (!File.Exists(projectFile))
                {
                    ExitWithError(
                        $"Project file {projectFile} does not exist. Please supply location of project with --project [path/to/project.csproj]"
                    );
                }

                // Validate version before processing
                var projectChecks = new ProjectChecks.ProjectChecks(projectFile);
                if (!projectChecks.SupportedSourceVersion())
                {
                    ExitWithError(
                        $"Version(s) in project file {projectFile} are not supported for the 'v8Tov10' upgrade. "
                            + $"This upgrade is for apps on version 8.x.x. "
                            + $"Please ensure both Altinn.App.Core and Altinn.App.Api are version 8.0.0 or higher (but below 9.0.0).",
                        exitCode: 2
                    );
                }

                // Job 1: Convert to project references and upgrade target framework
                if (!skipCsprojUpgrade && returnCode == 0)
                {
                    returnCode = await ConvertToProjectReferences(projectFile, targetFramework);
                }

                // Job 2: Remove Swashbuckle.AspNetCore dependency
                if (returnCode == 0)
                {
                    returnCode = await RemoveSwashbucklePackage(projectFile);
                }

                // Job 3: Convert conditional rendering rules to layout hidden expressions
                if (returnCode == 0)
                {
                    returnCode = await ConvertConditionalRenderingRules(projectFolder);
                }

                // Job 4: Generate data processors for data processing rules
                if (returnCode == 0)
                {
                    returnCode = await GenerateDataProcessors(projectFolder);
                }

                // Job 5: Cleanup legacy rule files
                if (returnCode == 0)
                {
                    returnCode = await CleanupLegacyRuleFiles(projectFolder);
                }

                // Job 6: Migrate Index.cshtml to assets.json configuration
                if (returnCode == 0)
                {
                    returnCode = await MigrateIndexCshtml(projectFolder);
                }

                if (returnCode == 0)
                {
                    Console.WriteLine("Please verify that the application is still working as expected.");
                }
                else
                {
                    Console.WriteLine("Upgrade completed with errors. Please check for errors in the log above.");
                }
                Environment.Exit(returnCode);
            }
        );

        return upgradeCommand;
    }

    static async Task<int> RemoveSwashbucklePackage(string projectFile)
    {
        var rewriter = new ProjectFileRewriter(projectFile);
        await rewriter.RemovePackageReference("Swashbuckle.AspNetCore");
        await Console.Out.WriteLineAsync("Swashbuckle.AspNetCore package reference removed");
        return 0;
    }

    static async Task<int> ConvertToProjectReferences(string projectFile, string targetFramework)
    {
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile, targetFramework: targetFramework);
            await rewriter.ConvertToProjectReferences();
            return 0;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"Error converting to project references: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Job 3: Convert conditional rendering rules to layout hidden expressions
    /// </summary>
    static async Task<int> ConvertConditionalRenderingRules(string projectFolder)
    {
        try
        {
            await Console.Out.WriteLineAsync("Converting conditional rendering rules to layout hidden expressions...");

            var converter = new ConditionalRenderingConverter(projectFolder);
            var stats = converter.ConvertAllLayoutSets();
            if (stats.TotalRules == 0)
            {
                await Console.Out.WriteLineAsync("No conditional rendering rules found to convert");
            }

            return 0;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"Error converting conditional rendering rules: {ex.Message}");
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
            await Console.Out.WriteLineAsync("Generating data processors for data processing rules...");

            var uiPath = Path.Combine(projectFolder, "App", "ui");
            if (!Directory.Exists(uiPath))
            {
                uiPath = Path.Combine(projectFolder, "ui");
                if (!Directory.Exists(uiPath))
                {
                    await Console.Out.WriteLineAsync("No UI directory found, skipping data processor generation");
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
                    await Console.Error.WriteLineAsync(
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
                    await Console.Error.WriteLineAsync(
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
                    await Console.Error.WriteLineAsync(
                        $"Failed to generate data processor for layout set '{layoutSetName}'"
                    );
                    foreach (var error in generationResult.Errors)
                    {
                        await Console.Error.WriteLineAsync($"  Error: {error}");
                    }
                    continue;
                }

                // Write the file
                var fileWriter = new DataProcessorFileWriter(projectFolder);
                var filePath = fileWriter.WriteDataProcessor(
                    generationResult.ClassName,
                    generationResult.GeneratedCode
                );
                await Console.Out.WriteLineAsync($"Generated data processor: {filePath}");

                // Register in Program.cs
                var programUpdater = new ProgramCsUpdater(projectFolder);
                programUpdater.RegisterDataProcessor(generationResult.ClassName);

                if (generationResult.FailedConversions > 0)
                {
                    await Console.Out.WriteLineAsync(
                        $"  Warning: {generationResult.FailedConversions} of {generationResult.TotalRules} rules failed to convert to C# code"
                    );
                }

                totalProcessed++;
            }

            if (totalProcessed == 0)
            {
                await Console.Out.WriteLineAsync("No data processing rules found to convert");
            }

            return 0;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"Error generating data processors: {ex.Message}");
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
            await Console.Out.WriteLineAsync("Cleaning up legacy rule files...");

            var cleanup = new LegacyRuleFileCleanup(projectFolder);
            var stats = cleanup.CleanupAllLayoutSets();

            if (stats.RuleConfigFilesDeleted == 0 && stats.RuleHandlerFilesDeleted == 0)
            {
                await Console.Out.WriteLineAsync("No legacy rule files found to cleanup");
                return 0;
            }

            await Console.Out.WriteLineAsync($"Deleted {stats.RuleConfigFilesDeleted} RuleConfiguration.json files");
            await Console.Out.WriteLineAsync($"Deleted {stats.RuleHandlerFilesDeleted} RuleHandler.js files");

            return 0;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"Error cleaning up legacy rule files: {ex.Message}");
            return 1;
        }
    }

    /// <summary>
    /// Job 6: Migrate Index.cshtml to assets.json configuration
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
            await Console.Error.WriteLineAsync($"Error migrating Index.cshtml: {ex.Message}");
            return 1;
        }
    }

    [DoesNotReturn]
    private static void ExitWithError(string message, int exitCode = 1)
    {
        Console.Error.WriteLine(message);
        Environment.Exit(exitCode);
    }
}
