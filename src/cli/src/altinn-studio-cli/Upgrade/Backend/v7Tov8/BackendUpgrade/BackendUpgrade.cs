using System.CommandLine;
using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.CodeRewriters;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.DockerfileRewriters;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProcessRewriter;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProjectRewriters;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.MSBuild;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.BackendUpgrade;

/// <summary>
/// Defines the upgrade command for upgrading app-lib-dotnet in an Altinn 3 application
/// </summary>
internal static class BackendUpgrade
{
    /// <summary>
    /// Get the actual upgrade command
    /// </summary>
    /// <param name="projectFolderOption">Option for setting the root folder of the project</param>
    /// <returns></returns>
    public static Command GetUpgradeCommand(Option<string> projectFolderOption)
    {
        var projectFileOption = new Option<string>(name: "--project")
        {
            Description = "The project file to read relative to --folder",
            DefaultValueFactory = _ => "App/App.csproj",
        };
        var processFileOption = new Option<string>(name: "--process")
        {
            Description = "The process file to read relative to --folder",
            DefaultValueFactory = _ => "App/config/process/process.bpmn",
        };
        var appSettingsFolderOption = new Option<string>(name: "--appsettings-folder")
        {
            Description = "The folder where the appsettings.*.json files are located",
            DefaultValueFactory = _ => "App",
        };
        var targetVersionOption = new Option<string>(name: "--target-version")
        {
            Description = "The target version to upgrade to",
            DefaultValueFactory = _ => "8.7.0",
        };
        var targetFrameworkOption = new Option<string>(name: "--target-framework")
        {
            Description = "The target dotnet framework version to upgrade to",
            DefaultValueFactory = _ => "net8.0",
        };
        var skipCsprojUpgradeOption = new Option<bool>(name: "--skip-csproj-upgrade")
        {
            Description = "Skip csproj file upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipDockerUpgradeOption = new Option<bool>(name: "--skip-dockerfile-upgrade")
        {
            Description = "Skip Dockerfile upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipCodeUpgradeOption = new Option<bool>(name: "--skip-code-upgrade")
        {
            Description = "Skip code upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipProcessUpgradeOption = new Option<bool>(name: "--skip-process-upgrade")
        {
            Description = "Skip process file upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipAppSettingsUpgradeOption = new Option<bool>(name: "--skip-appsettings-upgrade")
        {
            Description = "Skip appsettings file upgrade",
            DefaultValueFactory = _ => false,
        };
        var upgradeCommand = new Command("backend-v8", "Upgrade an app from app-lib-dotnet v7 to v8")
        {
            projectFolderOption,
            projectFileOption,
            processFileOption,
            appSettingsFolderOption,
            targetVersionOption,
            targetFrameworkOption,
            skipCsprojUpgradeOption,
            skipDockerUpgradeOption,
            skipCodeUpgradeOption,
            skipProcessUpgradeOption,
            skipAppSettingsUpgradeOption,
        };
        int returnCode = 0;
        upgradeCommand.SetAction(async result =>
        {
            var projectFolder = result.GetValue(projectFolderOption);
            var projectFile = result.GetValue(projectFileOption);
            var processFile = result.GetValue(processFileOption);
            var appSettingsFolder = result.GetValue(appSettingsFolderOption);
            var targetVersion = result.GetValue(targetVersionOption);
            var targetFramework = result.GetValue(targetFrameworkOption);
            var skipCodeUpgrade = result.GetValue(skipCodeUpgradeOption);
            var skipProcessUpgrade = result.GetValue(skipProcessUpgradeOption);
            var skipCsprojUpgrade = result.GetValue(skipCsprojUpgradeOption);
            var skipDockerUpgrade = result.GetValue(skipDockerUpgradeOption);
            var skipAppSettingsUpgrade = result.GetValue(skipAppSettingsUpgradeOption);

            if (projectFolder is null or "CurrentDirectory")
                projectFolder = Directory.GetCurrentDirectory();

            if (projectFile is null)
                ExitWithError("Project file option is required but was not provided");

            if (processFile is null)
                ExitWithError("Process file option is required but was not provided");

            if (appSettingsFolder is null)
                ExitWithError("App settings folder option is required but was not provided");

            if (targetVersion is null)
                ExitWithError("Target version option is required but was not provided");

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
                processFile = Path.Combine(Directory.GetCurrentDirectory(), projectFolder, processFile);
                appSettingsFolder = Path.Combine(Directory.GetCurrentDirectory(), projectFolder, appSettingsFolder);
            }
            else
            {
                projectFile = Path.Combine(projectFolder, projectFile);
                processFile = Path.Combine(projectFolder, processFile);
                appSettingsFolder = Path.Combine(projectFolder, appSettingsFolder);
            }

            if (!File.Exists(projectFile))
            {
                ExitWithError(
                    $"Project file {projectFile} does not exist. Please supply location of project with --project [path/to/project.csproj]"
                );
            }

            var projectChecks = new ProjectChecks.ProjectChecks(projectFile);
            if (!projectChecks.SupportedSourceVersion())
            {
                ExitWithError(
                    $"Version(s) in project file {projectFile} is not supported. Please upgrade to version 7.0.0 or higher.",
                    exitCode: 2
                );
            }

            if (!skipCodeUpgrade)
            {
                returnCode = await UpgradeCode(projectFile);
            }

            if (!skipCsprojUpgrade && returnCode == 0)
            {
                returnCode = await UpgradeProjectFile(projectFile, targetVersion, targetFramework);
            }

            if (!skipDockerUpgrade && returnCode == 0)
            {
                returnCode = await UpgradeDockerfile(Path.Combine(projectFolder, "Dockerfile"), targetFramework);
            }

            if (!skipProcessUpgrade && returnCode == 0)
            {
                returnCode = await UpgradeProcess(processFile);
            }

            if (!skipAppSettingsUpgrade && returnCode == 0)
            {
                returnCode = await UpgradeAppSettings(appSettingsFolder);
            }

            if (returnCode == 0)
            {
                Console.WriteLine(
                    "Upgrade completed without errors. Please verify that the application is still working as expected."
                );
            }
            else
            {
                Console.WriteLine("Upgrade completed with errors. Please check for errors in the log above.");
            }
            Environment.Exit(returnCode);
        });

        return upgradeCommand;
    }

    static async Task<int> UpgradeProjectFile(string projectFile, string targetVersion, string targetFramework)
    {
        await Console.Out.WriteLineAsync("Trying to upgrade nuget versions in project file");
        var rewriter = new ProjectFileRewriter(projectFile, targetVersion, targetFramework);
        await rewriter.Upgrade();
        await Console.Out.WriteLineAsync("Nuget versions upgraded");
        return 0;
    }

    static async Task<int> UpgradeDockerfile(string dockerFile, string targetFramework)
    {
        if (!File.Exists(dockerFile))
        {
            await Console.Error.WriteLineAsync(
                $"Dockerfile {dockerFile} does not exist. Please supply location of project with --dockerfile [path/to/Dockerfile]"
            );
            return 1;
        }
        await Console.Out.WriteLineAsync("Trying to upgrade dockerfile");
        var rewriter = new DockerfileRewriter(dockerFile, targetFramework);
        await rewriter.Upgrade();
        await Console.Out.WriteLineAsync("Dockerfile upgraded");
        return 0;
    }

    static async Task<int> UpgradeCode(string projectFile)
    {
        await Console.Out.WriteLineAsync("Trying to upgrade references and using in code");

        MSBuildLocator.RegisterDefaults();
        var workspace = MSBuildWorkspace.Create();
        var project = await workspace.OpenProjectAsync(projectFile);
        var comp = await project.GetCompilationAsync();
        if (comp is null)
        {
            await Console.Error.WriteLineAsync("Could not get compilation");
            return 1;
        }
        foreach (var sourceTree in comp.SyntaxTrees)
        {
            SemanticModel sm = comp.GetSemanticModel(sourceTree);
            TypesRewriter rewriter = new(sm);
            SyntaxNode newSource = rewriter.Visit(await sourceTree.GetRootAsync());
            if (newSource != await sourceTree.GetRootAsync())
            {
                await File.WriteAllTextAsync(sourceTree.FilePath, newSource.ToFullString());
            }

            UsingRewriter usingRewriter = new();
            var newUsingSource = usingRewriter.Visit(newSource);
            if (newUsingSource != newSource)
            {
                await File.WriteAllTextAsync(sourceTree.FilePath, newUsingSource.ToFullString());
            }

            DataProcessorRewriter dataProcessorRewriter = new();
            var dataProcessorSource = dataProcessorRewriter.Visit(newUsingSource);
            if (dataProcessorSource != newUsingSource)
            {
                await File.WriteAllTextAsync(sourceTree.FilePath, dataProcessorSource.ToFullString());
            }

            if (
                sourceTree.FilePath.Contains("/models/", StringComparison.InvariantCultureIgnoreCase)
                || sourceTree.FilePath.Contains("\\models\\", StringComparison.InvariantCultureIgnoreCase)
            )
            {
                // Find all classes that are used in a List
                var classNamesInList = dataProcessorSource
                    .DescendantNodes()
                    .OfType<PropertyDeclarationSyntax>()
                    .Where(p => p is { Type: GenericNameSyntax { Identifier.ValueText: "List" } })
                    .Select(p =>
                        ((GenericNameSyntax)p.Type)
                            .TypeArgumentList.Arguments.OfType<IdentifierNameSyntax>()
                            .FirstOrDefault()
                            ?.Identifier.ValueText
                    )
                    .OfType<string>()
                    .ToList();

                var rowIdRewriter = new ModelRewriter(classNamesInList);
                var rowIdSource = rowIdRewriter.Visit(dataProcessorSource);
                if (rowIdSource != dataProcessorSource)
                {
                    await File.WriteAllTextAsync(sourceTree.FilePath, rowIdSource.ToFullString());
                }
            }
        }

        await Console.Out.WriteLineAsync("References and using upgraded");
        return 0;
    }

    static async Task<int> UpgradeProcess(string processFile)
    {
        if (!File.Exists(processFile))
        {
            await Console.Error.WriteLineAsync(
                $"Process file {processFile} does not exist. Please supply location of project with --process [path/to/project.csproj]"
            );
            return 1;
        }

        await Console.Out.WriteLineAsync("Trying to upgrade process file");
        ProcessUpgrader parser = new(processFile);
        parser.Upgrade();
        await parser.Write();
        var warnings = parser.GetWarnings();
        foreach (var warning in warnings)
        {
            await Console.Out.WriteLineAsync(warning);
        }

        await Console.Out.WriteLineAsync(
            warnings.Any()
                ? "Process file upgraded with warnings. Review the warnings above and make sure that the process file is still valid."
                : "Process file upgraded"
        );

        return 0;
    }

    static async Task<int> UpgradeAppSettings(string appSettingsFolder)
    {
        if (!Directory.Exists(appSettingsFolder))
        {
            await Console.Error.WriteLineAsync(
                $"App settings folder {appSettingsFolder} does not exist. Please supply location with --appsettings-folder [path/to/appsettings]"
            );
            return 1;
        }

        if (
            Directory.GetFiles(appSettingsFolder, AppSettingsRewriter.AppSettingsRewriter.AppSettingsFilePattern).Length
            == 0
        )
        {
            await Console.Error.WriteLineAsync($"No appsettings*.json files found in {appSettingsFolder}");
            return 1;
        }

        await Console.Out.WriteLineAsync("Trying to upgrade appsettings*.json files");
        AppSettingsRewriter.AppSettingsRewriter rewriter = new(appSettingsFolder);
        rewriter.Upgrade();
        await rewriter.Write();
        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            await Console.Out.WriteLineAsync(warning);
        }

        await Console.Out.WriteLineAsync(
            warnings.Any()
                ? "AppSettings files upgraded with warnings. Review the warnings above and make sure that the appsettings files are still valid."
                : "AppSettings files upgraded"
        );

        return 0;
    }

    [DoesNotReturn]
    private static void ExitWithError(string message, int exitCode = 1)
    {
        Console.Error.WriteLine(message);
        Environment.Exit(exitCode);
    }
}
