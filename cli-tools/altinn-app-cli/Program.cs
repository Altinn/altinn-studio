using System.CommandLine;
using System.CommandLine.Invocation;
using System.Reflection;
using altinn_app_cli.v7Tov8.AppSettingsRewriter;
using altinn_app_cli.v7Tov8.CodeRewriters;
using altinn_app_cli.v7Tov8.ProcessRewriter;
using altinn_app_cli.v7Tov8.ProjectChecks;
using altinn_app_cli.v7Tov8.ProjectRewriters;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace altinn_app_upgrade_cli;

class Program
{
    static async Task<int> Main(string[] args)
    {
        int returnCode = 0;
        var projectFolderOption = new Option<string>(name: "--folder", description: "The project folder to read", getDefaultValue: () => "CurrentDirectory");
        var projectFileOption = new Option<string>(name: "--project", description: "The project file to read relative to --folder", getDefaultValue: () => "App/App.csproj");
        var processFileOption = new Option<string>(name: "--process", description: "The process file to read relative to --folder", getDefaultValue: () => "App/config/process/process.bpmn");
        var appSettingsFolderOption = new Option<string>(name: "--appsettings-folder", description: "The folder where the appsettings.*.json files are located", getDefaultValue: () => "App");
        var targetVersionOption = new Option<string>(name: "--target-version", description: "The target version to upgrade to", getDefaultValue: () => "8.0.0-preview.9");
        var skipCsprojUpgradeOption = new Option<bool>(name: "--skip-csproj-upgrade", description: "Skip csproj file upgrade", getDefaultValue: () => false);
        var skipCodeUpgradeOption = new Option<bool>(name: "--skip-code-upgrade", description: "Skip code upgrade", getDefaultValue: () => false);
        var skipProcessUpgradeOption = new Option<bool>(name: "--skip-process-upgrade", description: "Skip process file upgrade", getDefaultValue: () => false);
        var skipAppSettingsUpgradeOption = new Option<bool>(name: "--skip-appsettings-upgrade", description: "Skip appsettings file upgrade", getDefaultValue: () => false);
        var rootCommand = new RootCommand("Command line interface for working with Altinn 3 Applications");
        var upgradeCommand = new Command("upgrade", "Upgrade an app from v7 to v8")
        {
            projectFolderOption,
            projectFileOption,
            processFileOption,
            appSettingsFolderOption,
            targetVersionOption,
            skipCsprojUpgradeOption,
            skipCodeUpgradeOption,
            skipProcessUpgradeOption,
            skipAppSettingsUpgradeOption,
        };
        rootCommand.AddCommand(upgradeCommand);
        var versionCommand = new Command("version", "Print version of altinn-app-cli");
        rootCommand.AddCommand(versionCommand);

        upgradeCommand.SetHandler(
            async (InvocationContext context) =>
            {
                var projectFolder = context.ParseResult.GetValueForOption(projectFolderOption)!;
                var projectFile = context.ParseResult.GetValueForOption(projectFileOption)!;
                var processFile = context.ParseResult.GetValueForOption(processFileOption)!;
                var appSettingsFolder = context.ParseResult.GetValueForOption(appSettingsFolderOption)!;
                var targetVersion = context.ParseResult.GetValueForOption(targetVersionOption)!;
                var skipCodeUpgrade = context.ParseResult.GetValueForOption(skipCodeUpgradeOption)!;
                var skipProcessUpgrade = context.ParseResult.GetValueForOption(skipProcessUpgradeOption)!;
                var skipCsprojUpgrade = context.ParseResult.GetValueForOption(skipCsprojUpgradeOption)!;
                var skipAppSettingsUpgrade = context.ParseResult.GetValueForOption(skipAppSettingsUpgradeOption)!;

                if (projectFolder == "CurrentDirectory")
                {
                    projectFolder = Directory.GetCurrentDirectory();
                }

                if (File.Exists(projectFolder))
                {
                    Console.WriteLine($"Project folder {projectFolder} does not exist. Please supply location of project with --folder [path/to/project]");
                    returnCode = 1;
                    return;
                }

                FileAttributes attr = File.GetAttributes(projectFolder);
                if ((attr & FileAttributes.Directory) != FileAttributes.Directory)
                {
                    Console.WriteLine($"Project folder {projectFolder} is a file. Please supply location of project with --folder [path/to/project]");
                    returnCode = 1;
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

                var projectChecks = new ProjectChecks(projectFile);
                if (!projectChecks.SupportedSourceVersion())
                {
                    Console.WriteLine($"Version(s) in project file {projectFile} is not supported. Please upgrade to version 7.0.0 or higher.");
                    returnCode = 2;
                    return;
                }

                if (!skipCsprojUpgrade)
                {
                    returnCode = await UpgradeNugetVersions(projectFile, targetVersion);
                }

                if (!skipCodeUpgrade && returnCode == 0)
                {
                    returnCode = await UpgradeCode(projectFile);
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
            }
        );

        versionCommand.SetHandler(() =>
        {
            var version = Assembly.GetEntryAssembly()?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "Unknown";
            Console.WriteLine($"altinn-app-cli v{version}");
        });
        await rootCommand.InvokeAsync(args);
        return returnCode;
    }

    static async Task<int> UpgradeNugetVersions(string projectFile, string targetVersion)
    {
        if (!File.Exists(projectFile))
        {
            Console.WriteLine($"Project file {projectFile} does not exist. Please supply location of project with --project [path/to/project.csproj]");
            return 1;
        }

        Console.WriteLine("Trying to upgrade nuget versions in project file");
        var rewriter = new ProjectFileRewriter(projectFile, targetVersion);
        await rewriter.Upgrade();
        Console.WriteLine("Nuget versions upgraded");
        return 0;
    }

    static async Task<int> UpgradeCode(string projectFile)
    {
        if (!File.Exists(projectFile))
        {
            Console.WriteLine($"Project file {projectFile} does not exist. Please supply location of project with --project [path/to/project.csproj]");
            return 1;
        }

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

        if (Directory.GetFiles(appSettingsFolder, AppSettingsRewriter.APP_SETTINGS_FILE_PATTERN).Count() == 0)
        {
            Console.WriteLine($"No appsettings*.json files found in {appSettingsFolder}");
            return 1;
        }

        Console.WriteLine("Trying to upgrade appsettings*.json files");
        AppSettingsRewriter rewriter = new(appSettingsFolder);
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
