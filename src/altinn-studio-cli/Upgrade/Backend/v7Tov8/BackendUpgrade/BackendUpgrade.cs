using System.CommandLine;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.CodeRewriters;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.DockerfileRewriters;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProcessRewriter;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProjectRewriters;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.BackendUpgrade;

/// <summary>
/// Defines the upgrade command for upgrading app-lib-dotnet in an Altinn 3 application
/// </summary>
public class BackendUpgrade
{
    /// <summary>
    /// Get the actual upgrade command
    /// </summary>
    /// <param name="projectFolderOption">Option for setting the root folder of the project</param>
    /// <returns></returns>
    public static Command GetUpgradeCommand(Option<string> projectFolderOption)
    {
        var projectFileOption = new Option<string>(name: "--project", description: "The project file to read relative to --folder", getDefaultValue: () => "App/App.csproj");
        var processFileOption = new Option<string>(name: "--process", description: "The process file to read relative to --folder", getDefaultValue: () => "App/config/process/process.bpmn");
        var appSettingsFolderOption = new Option<string>(name: "--appsettings-folder", description: "The folder where the appsettings.*.json files are located", getDefaultValue: () => "App");
        var targetVersionOption = new Option<string>(name: "--target-version", description: "The target version to upgrade to", getDefaultValue: () => "8.0.0-preview.11");
        var targetFrameworkOption = new Option<string>(name: "--target-framework", description: "The target dotnet framework version to upgrade to", getDefaultValue: () => "net8.0");
        var skipCsprojUpgradeOption = new Option<bool>(name: "--skip-csproj-upgrade", description: "Skip csproj file upgrade", getDefaultValue: () => false);
        var skipDockerUpgradeOption = new Option<bool>(name: "--skip-dockerfile-upgrade", description: "Skip Dockerfile upgrade", getDefaultValue: () => false);
        var skipCodeUpgradeOption = new Option<bool>(name: "--skip-code-upgrade", description: "Skip code upgrade", getDefaultValue: () => false);
        var skipProcessUpgradeOption = new Option<bool>(name: "--skip-process-upgrade", description: "Skip process file upgrade", getDefaultValue: () => false);
        var skipAppSettingsUpgradeOption = new Option<bool>(name: "--skip-appsettings-upgrade", description: "Skip appsettings file upgrade", getDefaultValue: () => false);
        var upgradeCommand = new Command("backend", "Upgrade an app from app-lib-dotnet v7 to v8")
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
        upgradeCommand.SetHandler(
            async context =>
            {
                var projectFolder = context.ParseResult.GetValueForOption(projectFolderOption)!;
                var projectFile = context.ParseResult.GetValueForOption(projectFileOption)!;
                var processFile = context.ParseResult.GetValueForOption(processFileOption)!;
                var appSettingsFolder = context.ParseResult.GetValueForOption(appSettingsFolderOption)!;
                var targetVersion = context.ParseResult.GetValueForOption(targetVersionOption)!;
                var targetFramework = context.ParseResult.GetValueForOption(targetFrameworkOption)!;
                var skipCodeUpgrade = context.ParseResult.GetValueForOption(skipCodeUpgradeOption);
                var skipProcessUpgrade = context.ParseResult.GetValueForOption(skipProcessUpgradeOption);
                var skipCsprojUpgrade = context.ParseResult.GetValueForOption(skipCsprojUpgradeOption);
                var skipDockerUpgrade = context.ParseResult.GetValueForOption(skipDockerUpgradeOption);
                var skipAppSettingsUpgrade = context.ParseResult.GetValueForOption(skipAppSettingsUpgradeOption);

                if (projectFolder == "CurrentDirectory")
                {
                    projectFolder = Directory.GetCurrentDirectory();
                }

                if (File.Exists(projectFolder))
                {
                    Console.WriteLine($"Project folder {projectFolder} does not exist. Please supply location of project with --folder [path/to/project]");
                    Environment.Exit(1);
                    return;
                }

                FileAttributes attr = File.GetAttributes(projectFolder);
                if ((attr & FileAttributes.Directory) != FileAttributes.Directory)
                {
                    Console.WriteLine($"Project folder {projectFolder} is a file. Please supply location of project with --folder [path/to/project]");
                    Environment.Exit(1);
                    return;
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
                    Console.WriteLine($"Project file {projectFile} does not exist. Please supply location of project with --project [path/to/project.csproj]");
                    Environment.Exit(1);
                    return;
                }

                var projectChecks = new ProjectChecks.ProjectChecks(projectFile);
                if (!projectChecks.SupportedSourceVersion())
                {
                    Console.WriteLine($"Version(s) in project file {projectFile} is not supported. Please upgrade to version 7.0.0 or higher.");
                    Environment.Exit(2);
                    return;
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
                    Console.WriteLine("Upgrade completed without errors. Please verify that the application is still working as expected.");
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
    
    
    static async Task<int> UpgradeProjectFile(string projectFile, string targetVersion, string targetFramework)
    {
        Console.WriteLine("Trying to upgrade nuget versions in project file");
        var rewriter = new ProjectFileRewriter(projectFile, targetVersion, targetFramework);
        await rewriter.Upgrade();
        Console.WriteLine("Nuget versions upgraded");
        return 0;
    }

    static async Task<int> UpgradeDockerfile(string dockerFile, string targetFramework)
    {
        if (!File.Exists(dockerFile))
        {
            Console.WriteLine($"Dockerfile {dockerFile} does not exist. Please supply location of project with --dockerfile [path/to/Dockerfile]");
            return 1;
        }
        Console.WriteLine("Trying to upgrade dockerfile");
        var rewriter = new DockerfileRewriter(dockerFile, targetFramework);
        await rewriter.Upgrade();
        Console.WriteLine("Dockerfile upgraded");
        return 0;
    }

    static async Task<int> UpgradeCode(string projectFile)
    {
        Console.WriteLine("Trying to upgrade references and using in code");

        MSBuildLocator.RegisterDefaults();
        var workspace = MSBuildWorkspace.Create();
        var project = await workspace.OpenProjectAsync(projectFile);
        var comp = await project.GetCompilationAsync();
        if (comp == null)
        {
            Console.WriteLine("Could not get compilation");
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
        }

        Console.WriteLine("References and using upgraded");
        return 0;
    }

    static async Task<int> UpgradeProcess(string processFile)
    {
        if (!File.Exists(processFile))
        {
            Console.WriteLine($"Process file {processFile} does not exist. Please supply location of project with --process [path/to/project.csproj]");
            return 1;
        }

        Console.WriteLine("Trying to upgrade process file");
        ProcessUpgrader parser = new(processFile);
        parser.Upgrade();
        await parser.Write();
        var warnings = parser.GetWarnings();
        foreach (var warning in warnings)
        {
            Console.WriteLine(warning);
        }

        Console.WriteLine(warnings.Any() ? "Process file upgraded with warnings. Review the warnings above and make sure that the process file is still valid." : "Process file upgraded");

        return 0;
    }

    static async Task<int> UpgradeAppSettings(string appSettingsFolder)
    {
        if (!Directory.Exists(appSettingsFolder))
        {
            Console.WriteLine($"App settings folder {appSettingsFolder} does not exist. Please supply location with --appsettings-folder [path/to/appsettings]");
            return 1;
        }

        if (Directory.GetFiles(appSettingsFolder, AppSettingsRewriter.AppSettingsRewriter.AppSettingsFilePattern).Count() == 0)
        {
            Console.WriteLine($"No appsettings*.json files found in {appSettingsFolder}");
            return 1;
        }

        Console.WriteLine("Trying to upgrade appsettings*.json files");
        AppSettingsRewriter.AppSettingsRewriter rewriter = new(appSettingsFolder);
        rewriter.Upgrade();
        await rewriter.Write();
        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            Console.WriteLine(warning);
        }

        Console.WriteLine(warnings.Any() ? "AppSettings files upgraded with warnings. Review the warnings above and make sure that the appsettings files are still valid." : "AppSettings files upgraded");

        return 0;
    }
}
