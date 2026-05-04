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

internal sealed record BackendUpgradeOptions(
    string ProjectFolder,
    string ProjectFile,
    string ProcessFile,
    string AppSettingsFolder,
    string TargetVersion,
    string TargetFramework,
    bool SkipCodeUpgrade,
    bool SkipProcessUpgrade,
    bool SkipCsprojUpgrade,
    bool SkipDockerfileUpgrade,
    bool SkipAppSettingsUpgrade,
    TextWriter Output,
    TextWriter Error,
    CancellationToken CancellationToken
);

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
        upgradeCommand.SetAction(async result =>
        {
            var returnCode = await RunAsync(
                new BackendUpgradeOptions(
                    result.GetValue(projectFolderOption) ?? "CurrentDirectory",
                    result.GetValue(projectFileOption) ?? "App/App.csproj",
                    result.GetValue(processFileOption) ?? "App/config/process/process.bpmn",
                    result.GetValue(appSettingsFolderOption) ?? "App",
                    result.GetValue(targetVersionOption) ?? "8.7.0",
                    result.GetValue(targetFrameworkOption) ?? "net8.0",
                    result.GetValue(skipCodeUpgradeOption),
                    result.GetValue(skipProcessUpgradeOption),
                    result.GetValue(skipCsprojUpgradeOption),
                    result.GetValue(skipDockerUpgradeOption),
                    result.GetValue(skipAppSettingsUpgradeOption),
                    Console.Out,
                    Console.Error,
                    CancellationToken.None
                )
            );
            Environment.Exit(returnCode);
        });

        return upgradeCommand;
    }

    internal static async Task<int> RunAsync(BackendUpgradeOptions options)
    {
        using var outputScope = UpgradeConsole.Use(options.Output, options.Error);
        var projectFolder = ResolveProjectFolder(options.ProjectFolder);
        if (!Directory.Exists(projectFolder))
            return WriteError(
                $"{projectFolder} does not exist. Please supply location of project with --folder [path/to/project]"
            );

        FileAttributes attr = File.GetAttributes(projectFolder);
        if ((attr & FileAttributes.Directory) != FileAttributes.Directory)
            return WriteError(
                $"Project folder {projectFolder} is a file. Please supply location of project with --folder [path/to/project]"
            );

        var projectFile = Path.Combine(projectFolder, options.ProjectFile);
        var processFile = Path.Combine(projectFolder, options.ProcessFile);
        var appSettingsFolder = Path.Combine(projectFolder, options.AppSettingsFolder);

        if (!File.Exists(projectFile))
            return WriteError(
                $"Project file {projectFile} does not exist. Please supply location of project with --project [path/to/project.csproj]"
            );

        var projectChecks = new ProjectChecks.ProjectChecks(projectFile);
        if (!projectChecks.SupportedSourceVersion())
            return WriteError(
                $"Version(s) in project file {projectFile} is not supported. Please upgrade to version 7.0.0 or higher.",
                exitCode: 2
            );

        var returnCode = 0;
        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipCodeUpgrade)
            returnCode = await UpgradeCode(projectFile);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipCsprojUpgrade && returnCode == 0)
            returnCode = await UpgradeProjectFile(projectFile, options.TargetVersion, options.TargetFramework);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipDockerfileUpgrade && returnCode == 0)
            returnCode = await UpgradeDockerfile(Path.Combine(projectFolder, "Dockerfile"), options.TargetFramework);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipProcessUpgrade && returnCode == 0)
            returnCode = await UpgradeProcess(processFile);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipAppSettingsUpgrade && returnCode == 0)
            returnCode = await UpgradeAppSettings(appSettingsFolder);

        UpgradeConsole.WriteLine(
            returnCode == 0
                ? "Upgrade completed without errors. Please verify that the application is still working as expected."
                : "Upgrade completed with errors. Please check for errors in the log above."
        );
        return returnCode;
    }

    static async Task<int> UpgradeProjectFile(string projectFile, string targetVersion, string targetFramework)
    {
        await UpgradeConsole.Out.WriteLineAsync("Trying to upgrade nuget versions in project file");
        var rewriter = new ProjectFileRewriter(projectFile, targetVersion, targetFramework);
        await rewriter.Upgrade();
        await UpgradeConsole.Out.WriteLineAsync("Nuget versions upgraded");
        return 0;
    }

    static async Task<int> UpgradeDockerfile(string dockerFile, string targetFramework)
    {
        if (!File.Exists(dockerFile))
        {
            await UpgradeConsole.Error.WriteLineAsync(
                $"Dockerfile {dockerFile} does not exist. Please supply location of project with --dockerfile [path/to/Dockerfile]"
            );
            return 1;
        }
        await UpgradeConsole.Out.WriteLineAsync("Trying to upgrade dockerfile");
        var rewriter = new DockerfileRewriter(dockerFile, targetFramework);
        await rewriter.Upgrade();
        await UpgradeConsole.Out.WriteLineAsync("Dockerfile upgraded");
        return 0;
    }

    static async Task<int> UpgradeCode(string projectFile)
    {
        await UpgradeConsole.Out.WriteLineAsync("Trying to upgrade references and using in code");

        if (!MSBuildLocator.IsRegistered)
            MSBuildLocator.RegisterDefaults();
        var workspace = MSBuildWorkspace.Create();
        var project = await workspace.OpenProjectAsync(projectFile);
        var comp = await project.GetCompilationAsync();
        if (comp is null)
        {
            await UpgradeConsole.Error.WriteLineAsync("Could not get compilation");
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

        await UpgradeConsole.Out.WriteLineAsync("References and using upgraded");
        return 0;
    }

    static async Task<int> UpgradeProcess(string processFile)
    {
        if (!File.Exists(processFile))
        {
            await UpgradeConsole.Error.WriteLineAsync(
                $"Process file {processFile} does not exist. Please supply location of project with --process [path/to/project.csproj]"
            );
            return 1;
        }

        await UpgradeConsole.Out.WriteLineAsync("Trying to upgrade process file");
        ProcessUpgrader parser = new(processFile);
        parser.Upgrade();
        await parser.Write();
        var warnings = parser.GetWarnings();
        foreach (var warning in warnings)
        {
            await UpgradeConsole.Out.WriteLineAsync(warning);
        }

        await UpgradeConsole.Out.WriteLineAsync(
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
            await UpgradeConsole.Error.WriteLineAsync(
                $"App settings folder {appSettingsFolder} does not exist. Please supply location with --appsettings-folder [path/to/appsettings]"
            );
            return 1;
        }

        if (
            Directory.GetFiles(appSettingsFolder, AppSettingsRewriter.AppSettingsRewriter.AppSettingsFilePattern).Length
            == 0
        )
        {
            await UpgradeConsole.Error.WriteLineAsync($"No appsettings*.json files found in {appSettingsFolder}");
            return 1;
        }

        await UpgradeConsole.Out.WriteLineAsync("Trying to upgrade appsettings*.json files");
        AppSettingsRewriter.AppSettingsRewriter rewriter = new(appSettingsFolder);
        rewriter.Upgrade();
        await rewriter.Write();
        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            await UpgradeConsole.Out.WriteLineAsync(warning);
        }

        await UpgradeConsole.Out.WriteLineAsync(
            warnings.Any()
                ? "AppSettings files upgraded with warnings. Review the warnings above and make sure that the appsettings files are still valid."
                : "AppSettings files upgraded"
        );

        return 0;
    }

    private static string ResolveProjectFolder(string projectFolder)
    {
        if (projectFolder == "CurrentDirectory")
            return Directory.GetCurrentDirectory();

        return Path.IsPathRooted(projectFolder)
            ? projectFolder
            : Path.Combine(Directory.GetCurrentDirectory(), projectFolder);
    }

    private static int WriteError(string message, int exitCode = 1)
    {
        UpgradeConsole.WriteErrorLine(message);
        return exitCode;
    }
}
