using System.CommandLine;
using System.Reflection;

namespace Altinn.Studio.Cli.Version;

/// <summary>
/// Contains the version command
/// </summary>
public static class VersionCommand
{
    /// <summary>
    /// Gets the version command
    /// </summary>
    /// <param name="executableName"></param>
    /// <returns></returns>
    public static Command GetVersionCommand(string executableName)
    {
        var versionCommand = new Command("version", $"Print version of {executableName} cli");
        versionCommand.SetAction(_ =>
        {
            var version =
                Assembly
                    .GetEntryAssembly()
                    ?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
                    ?.InformationalVersion ?? "Unknown";
            Console.WriteLine($"{executableName} cli v{version}");
        });
        return versionCommand;
    }
}
