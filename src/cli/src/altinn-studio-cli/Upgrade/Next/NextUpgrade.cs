using System.CommandLine;
using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProjectRewriters;
using Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

namespace Altinn.Studio.Cli.Upgrade.Next;

/// <summary>
/// Defines the upgrade command for upgrading both backend and frontend to the next version
/// </summary>
internal static class NextUpgrade
{
    /// <summary>
    /// Get the next upgrade command
    /// </summary>
    /// <param name="projectFolderOption">Option for setting the root folder of the project</param>
    /// <returns>The command for upgrading to the next version</returns>
    public static Command GetUpgradeCommand(Option<string> projectFolderOption)
    {
        var projectFileOption = new Option<string>(
            name: "--project",
            description: "The project file to read relative to --folder",
            getDefaultValue: () => "App/App.csproj"
        );
        var targetFrameworkOption = new Option<string>(
            name: "--target-framework",
            description: "The target dotnet framework version to upgrade to",
            getDefaultValue: () => "net8.0"
        );
        var skipCsprojUpgradeOption = new Option<bool>(
            name: "--skip-csproj-upgrade",
            description: "Skip csproj file upgrade",
            getDefaultValue: () => false
        );

        var upgradeCommand = new Command("next", "Upgrade an app to the next version (both backend and frontend)")
        {
            projectFolderOption,
            projectFileOption,
            targetFrameworkOption,
            skipCsprojUpgradeOption,
        };

        // Add subcommands
        upgradeCommand.AddCommand(RuleConvertCommand.GetCommand(projectFolderOption));

        int returnCode = 0;
        upgradeCommand.SetHandler(async context =>
        {
            var projectFolder = context.ParseResult.GetValueForOption(projectFolderOption);
            var projectFile = context.ParseResult.GetValueForOption(projectFileOption);
            var targetFramework = context.ParseResult.GetValueForOption(targetFrameworkOption);
            var skipCsprojUpgrade = context.ParseResult.GetValueForOption(skipCsprojUpgradeOption);

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

            // Job 1: Convert to project references and upgrade target framework
            if (!skipCsprojUpgrade && returnCode == 0)
            {
                returnCode = await ConvertToProjectReferences(projectFile, projectFolder, targetFramework);
            }

            // Job 2: Remove Swashbuckle.AspNetCore dependency
            if (returnCode == 0)
            {
                returnCode = await RemoveSwashbucklePackage(projectFile);
            }

            // TODO: Add more upgrade jobs here (frontend, rules, etc.)

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

    static async Task<int> RemoveSwashbucklePackage(string projectFile)
    {
        var rewriter = new ProjectFileRewriter(projectFile);
        await rewriter.RemovePackageReference("Swashbuckle.AspNetCore");
        await Console.Out.WriteLineAsync("Swashbuckle.AspNetCore package reference removed");
        return 0;
    }

    static async Task<int> ConvertToProjectReferences(string projectFile, string projectFolder, string targetFramework)
    {
        try
        {
            var rewriter = new ProjectFileRewriter(projectFile, targetFramework: targetFramework);
            await rewriter.ConvertToProjectReferences(projectFolder);
            await Console.Out.WriteLineAsync(
                "Package references converted to project references and target framework updated"
            );
            return 0;
        }
        catch (Exception ex)
        {
            await Console.Error.WriteLineAsync($"Error converting to project references: {ex.Message}");
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
