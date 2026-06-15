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

    internal static async Task Migrate(string projectFolder, string targetFramework)
    {
        var dockerfilePath = Path.Combine(projectFolder, "Dockerfile");
        if (!File.Exists(dockerfilePath))
        {
            await UpgradeConsole.Out.WriteLineAsync("No Dockerfile found, skipping Dockerfile migration");
            return;
        }

        var imageTag = GetImageTag(targetFramework);
        var lines = await File.ReadAllLinesAsync(dockerfilePath);
        var updated = Array.ConvertAll(lines, line => ReplaceImageTag(line, imageTag));

        if (!lines.SequenceEqual(updated))
        {
            await File.WriteAllLinesAsync(dockerfilePath, updated);
            await UpgradeConsole.Out.WriteLineAsync($"Dockerfile updated to .NET image tag '{imageTag}'");
            return;
        }

        if (lines.Any(IsDotnetBaseImage))
        {
            await UpgradeConsole.Out.WriteLineAsync($"Dockerfile already targets .NET image tag '{imageTag}'");
            return;
        }

        await UpgradeConsole.Error.WriteLineAsync(
            "Warning: No .NET base image found in Dockerfile. Update the .NET version manually to match the app."
        );
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
