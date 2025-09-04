using System.CommandLine;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.BackendUpgrade;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FrontendUpgrade;

namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Contains the upgrade command
/// </summary>
public static class UpgradeCommand
{
    /// <summary>
    /// Gets the upgrade command
    /// </summary>
    /// <returns></returns>
    public static Command GetUpgradeCommand()
    {
        var projectFolderOption = new Option<string>(
            name: "--folder",
            description: "The project folder to read",
            getDefaultValue: () => "CurrentDirectory"
        );
        var upgradeCommand = new Command("upgrade", "Upgrade an app") { projectFolderOption };
        upgradeCommand.AddCommand(FrontendUpgrade.GetUpgradeCommand(projectFolderOption));
        upgradeCommand.AddCommand(BackendUpgrade.GetUpgradeCommand(projectFolderOption));
        return upgradeCommand;
    }
}
