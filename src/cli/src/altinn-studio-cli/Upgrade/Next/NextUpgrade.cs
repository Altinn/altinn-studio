using System.CommandLine;
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
        var upgradeCommand = new Command("next", "Upgrade an app to the next version (both backend and frontend)")
        {
            projectFolderOption,
        };

        // Add subcommands
        upgradeCommand.AddCommand(RuleConvertCommand.GetCommand(projectFolderOption));

        upgradeCommand.SetHandler(context =>
        {
            Console.WriteLine("Next upgrade not yet implemented");
            Environment.Exit(0);
        });

        return upgradeCommand;
    }
}
