using System.CommandLine;
using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.BackendUpgrade;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FrontendUpgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov10;

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
        var projectFolderOption = new Option<string>(name: "--folder")
        {
            Description = "The project folder to read",
            DefaultValueFactory = _ => "CurrentDirectory",
        };
        var upgradeCommand = new Command("upgrade", "Upgrade an app")
        {
            projectFolderOption,
            FrontendUpgrade.GetUpgradeCommand(projectFolderOption),
            BackendUpgrade.GetUpgradeCommand(projectFolderOption),
            V8Tov10Upgrade.GetUpgradeCommand(projectFolderOption),
        };
        return upgradeCommand;
    }
}
