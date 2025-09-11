using System.CommandLine;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Version;

namespace Altinn.Studio.Cli;

internal sealed class Program
{
    private const string RootCommandName = "altinn-studio";

    static async Task<int> Main(string[] args)
    {
        var rootCommand = new RootCommand("Command line interface for working with Altinn 3 Applications");
        rootCommand.Name = RootCommandName;
        rootCommand.AddCommand(UpgradeCommand.GetUpgradeCommand());
        rootCommand.AddCommand(VersionCommand.GetVersionCommand(RootCommandName));
        await rootCommand.InvokeAsync(args);
        return 0;
    }
}
