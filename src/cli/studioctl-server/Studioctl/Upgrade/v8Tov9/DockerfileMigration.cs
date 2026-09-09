using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Updates the .NET base image tags in the app Dockerfile to match the target framework
/// of the upgraded project.
/// </summary>
internal static class DockerfileMigration
{
    // Matches "FROM mcr.microsoft.com/dotnet/{sdk|aspnet}:<tag>[ AS <stage>]"
    private static readonly Regex _sdkImagePattern = new(
        @"(^FROM mcr\.microsoft\.com/dotnet/sdk):(.+?)( AS .*)?$",
        RegexOptions.None,
        TimeSpan.FromSeconds(1)
    );

    private static readonly Regex _aspNetImagePattern = new(
        @"(^FROM mcr\.microsoft\.com/dotnet/aspnet):(.+?)( AS .*)?$",
        RegexOptions.None,
        TimeSpan.FromSeconds(1)
    );

    /// <returns>
    /// Returns 0 on success, 3 for manual follow up.
    /// </returns>
    internal static async Task<int> Migrate(string projectFolder, string targetFramework)
    {
        var dockerfilePath = Path.Combine(projectFolder, "Dockerfile");
        if (!File.Exists(dockerfilePath))
        {
            UpgradeConsole.Skip("No Dockerfile found");
            return 0;
        }

        var imageTag = GetImageTag(targetFramework);
        var lines = await File.ReadAllLinesAsync(dockerfilePath);
        var updated = Array.ConvertAll(lines, line => ReplaceImageTag(line, imageTag));

        if (!lines.SequenceEqual(updated))
        {
            await File.WriteAllLinesAsync(dockerfilePath, updated);
            UpgradeConsole.Ok($"Updated to .NET image tag '{imageTag}'");
            return 0;
        }

        if (lines.Any(IsDotnetBaseImage))
        {
            UpgradeConsole.Skip($"Already targets .NET image tag '{imageTag}'");
            return 0;
        }

        UpgradeConsole.Todo(
            "No .NET base image found in the Dockerfile. Update the .NET version by hand to match the app."
        );
        return 3;
    }

    /// <summary>
    /// Derives the .NET image tag from the target framework, e.g. "net10.0" => "10.0-alpine".
    /// </summary>
    private static string GetImageTag(string targetFramework)
    {
        var version = targetFramework.StartsWith("net", StringComparison.OrdinalIgnoreCase)
            ? targetFramework["net".Length..]
            : targetFramework;
        return $"{version}-alpine";
    }

    private static bool IsDotnetBaseImage(string line) =>
        _sdkImagePattern.IsMatch(line) || _aspNetImagePattern.IsMatch(line);

    private static string ReplaceImageTag(string line, string imageTag)
    {
        line = _sdkImagePattern.Replace(line, $"$1:{imageTag}$3");
        line = _aspNetImagePattern.Replace(line, $"$1:{imageTag}$3");
        return line;
    }
}
