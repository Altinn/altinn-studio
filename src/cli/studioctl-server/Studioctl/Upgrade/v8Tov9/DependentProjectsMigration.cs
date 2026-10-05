using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Moves the projects that reference the app project - in practice a service owner's own test project -
/// to the app's new target framework. A project cannot reference one built for a newer framework
/// (NU1201), so leaving them behind makes the whole solution fail to restore.
/// </summary>
internal static class DependentProjectsMigration
{
    private static readonly Regex _netFrameworkPattern = new(
        @"^net(\d+)\.(\d+)$",
        RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1)
    );

    /// <returns>
    /// Returns 0 on success, 3 for manual follow up.
    /// </returns>
    internal static async Task<int> Migrate(string projectFolder, string appProjectFile, string targetFramework)
    {
        var target =
            ParseFramework(targetFramework)
            ?? throw new ArgumentException(
                $"Unsupported target framework '{targetFramework}'",
                nameof(targetFramework)
            );
        var appProjectPath = Path.GetFullPath(appProjectFile);

        var dependents = Directory
            .EnumerateFiles(projectFolder, "*.csproj", SearchOption.AllDirectories)
            .Where(path => !BuildOutputPaths.IsBuildOutput(Path.GetRelativePath(projectFolder, path)))
            .Where(path => !SamePath(Path.GetFullPath(path), appProjectPath))
            .Where(path => ReferencesProject(path, appProjectPath))
            .Order(StringComparer.Ordinal)
            .ToList();

        if (dependents.Count == 0)
        {
            UpgradeConsole.Skip("No other projects reference the app project");
            return 0;
        }

        var returnCode = 0;
        foreach (var dependent in dependents)
        {
            var name = Path.GetRelativePath(projectFolder, dependent);
            var project = XDocument.Load(dependent);
            var properties = project.Root?.Elements("PropertyGroup").ToList() ?? [];

            if (properties.Elements("TargetFrameworks").Any())
            {
                UpgradeConsole.Todo(
                    $"{name} targets several frameworks. Make sure each one is {targetFramework} or later, as it references the app project."
                );
                returnCode = 3;
                continue;
            }

            var frameworks = properties.Elements("TargetFramework").Select(e => e.Value.Trim()).Distinct().ToList();
            if (frameworks.Count != 1 || ParseFramework(frameworks[0]) is not { } current)
            {
                var found = frameworks.Count == 0 ? "no TargetFramework" : string.Join(", ", frameworks);
                UpgradeConsole.Todo(
                    $"{name} references the app project but sets {found}. Make sure it targets {targetFramework} or later."
                );
                returnCode = 3;
                continue;
            }

            if (current >= target)
            {
                UpgradeConsole.Skip($"{name} already targets {frameworks[0]}");
                continue;
            }

            await ReplaceTargetFramework(dependent, frameworks[0], targetFramework);
            UpgradeConsole.Ok($"{name} moved from {frameworks[0]} to {targetFramework}");
        }

        return returnCode;
    }

    /// <summary>
    /// Edits only the framework value, so the rest of a project file the service owner wrote keeps its
    /// layout and encoding.
    /// </summary>
    private static async Task ReplaceTargetFramework(string projectPath, string from, string to)
    {
        var bytes = await File.ReadAllBytesAsync(projectPath);
        var preamble = Encoding.UTF8.Preamble;
        var hasBom = bytes.AsSpan().StartsWith(preamble);
        var content = Encoding.UTF8.GetString(hasBom ? bytes[preamble.Length..] : bytes);

        var pattern = new Regex(
            $@"(<TargetFramework>\s*){Regex.Escape(from)}(\s*</TargetFramework>)",
            RegexOptions.CultureInvariant,
            TimeSpan.FromSeconds(1)
        );
        var updated = pattern.Replace(content, match => match.Groups[1].Value + to + match.Groups[2].Value);

        await File.WriteAllTextAsync(projectPath, updated, new UTF8Encoding(hasBom));
    }

    private static Version? ParseFramework(string framework)
    {
        var match = _netFrameworkPattern.Match(framework);
        return match.Success
            ? new Version(
                int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture),
                int.Parse(match.Groups[2].Value, CultureInfo.InvariantCulture)
            )
            : null;
    }

    private static bool ReferencesProject(string projectPath, string referencedPath)
    {
        var projectDirectory = Path.GetDirectoryName(projectPath) ?? projectPath;
        return XDocument
            .Load(projectPath)
            .Descendants("ProjectReference")
            .Select(reference => reference.Attribute("Include")?.Value)
            .OfType<string>()
            .Select(include => include.Replace('\\', Path.DirectorySeparatorChar))
            .Any(include => SamePath(Path.GetFullPath(include, projectDirectory), referencedPath));
    }

    // App repositories are edited on Windows and macOS too, where paths ignore case.
    private static bool SamePath(string left, string right) =>
        string.Equals(left, right, StringComparison.OrdinalIgnoreCase);
}
