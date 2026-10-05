using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Build.Evaluation;
using Microsoft.Build.Exceptions;
using Microsoft.Build.Locator;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Moves the projects that reference the app project - in practice a service owner's own test project -
/// to the app's target framework. A project cannot reference one built for a newer framework (NU1201),
/// so leaving them behind makes the whole solution fail to restore.
/// <para>
/// Projects are evaluated with MSBuild rather than read as XML, so a framework set through a property
/// (<c>$(AppTargetFramework)</c>), a <c>Directory.Build.props</c> or a condition is understood the way
/// <c>dotnet build</c> understands it, and is changed where it is defined.
/// </para>
/// </summary>
internal static class DependentProjectsMigration
{
    /// <summary>
    /// How many folders below the repository root a dependent project may sit, so that
    /// <c>Tests/Tests.csproj</c> and <c>test/App.Tests/App.Tests.csproj</c> are found without walking
    /// whatever else a repository holds.
    /// </summary>
    internal const int MaxProjectDepth = 3;

    private const string NetCoreIdentifier = ".NETCoreApp";

    private sealed record Edit(string File, int Line, string Name, string From);

    /// <returns>
    /// Returns 0 on success, 3 for manual follow up.
    /// </returns>
    internal static Task<int> Migrate(string projectFolder, string appProjectFile)
    {
        if (!MSBuildLocator.IsRegistered)
            MSBuildLocator.RegisterDefaults();

        // MSBuild types may only be loaded once the locator has registered them.
        return MigrateWithMSBuild(projectFolder, appProjectFile);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static async Task<int> MigrateWithMSBuild(string projectFolder, string appProjectFile)
    {
        var root = Path.GetFullPath(projectFolder);
        var appProjectPath = Path.GetFullPath(appProjectFile);
        using var projects = new ProjectCollection();

        var app = projects.LoadProject(appProjectPath);
        var appFramework = app.GetPropertyValue("TargetFramework");
        if (Framework(app) is not { } target)
        {
            UpgradeConsole.Skip("The app project does not target a single .NET framework");
            return 0;
        }

        var returnCode = 0;
        var dependents = new List<(string Name, Project Project)>();
        foreach (var path in FindProjectFiles(root).Where(path => !SamePath(path, appProjectPath)))
        {
            var name = Path.GetRelativePath(root, path);
            try
            {
                var project = projects.LoadProject(path);
                if (ReferencesProject(project, appProjectPath))
                    dependents.Add((name, project));
            }
            catch (InvalidProjectFileException ex)
            {
                UpgradeConsole.Todo(
                    $"Could not read {name}: {ex.BaseMessage} If it references the app project, make sure it targets {appFramework}."
                );
                returnCode = 3;
            }
        }

        if (dependents.Count == 0 && returnCode == 0)
        {
            UpgradeConsole.Skip("No other projects reference the app project");
            return 0;
        }

        var edits = new Dictionary<(string File, int Line), Edit>();
        foreach (var (name, project) in dependents)
        {
            if (project.GetPropertyValue("TargetFrameworks") is { Length: > 0 } frameworks)
            {
                UpgradeConsole.Todo(
                    $"{name} targets {frameworks}. Make sure each one is {appFramework} or later, as it references the app project."
                );
                returnCode = 3;
                continue;
            }

            var current = project.GetPropertyValue("TargetFramework");
            if (Framework(project) is not { } version)
            {
                UpgradeConsole.Todo(
                    $"{name} references the app project but targets '{current}'. Make sure it targets {appFramework} or later."
                );
                returnCode = 3;
                continue;
            }

            if (version >= target)
            {
                UpgradeConsole.Skip($"{name} already targets {current}");
                continue;
            }

            if (FindDefinition(project, root) is not { } edit)
            {
                UpgradeConsole.Todo(
                    $"{name} targets {current}, set outside the app repository or computed from other properties. Make it target {appFramework}."
                );
                returnCode = 3;
                continue;
            }

            edits.TryAdd((edit.File, edit.Line), edit);
            var where = SamePath(edit.File, project.FullPath)
                ? ""
                : $" (set in {Path.GetRelativePath(root, edit.File)})";
            UpgradeConsole.Ok($"{name} moved from {current} to {appFramework}{where}");
        }

        foreach (var edit in edits.Values)
            await ReplaceValue(edit, appFramework);

        return returnCode;
    }

    private static IEnumerable<string> FindProjectFiles(string root) =>
        Directory
            .EnumerateFiles(
                root,
                "*.csproj",
                new EnumerationOptions
                {
                    RecurseSubdirectories = true,
                    MaxRecursionDepth = MaxProjectDepth,
                    IgnoreInaccessible = true,
                    // Hidden covers dot-folders such as .git on Unix; reparse points could loop.
                    AttributesToSkip = FileAttributes.Hidden | FileAttributes.System | FileAttributes.ReparsePoint,
                }
            )
            .Where(path => !BuildOutputPaths.IsBuildOutput(Path.GetRelativePath(root, path)))
            .Order(StringComparer.Ordinal);

    /// <summary>The .NET version a project builds for, as MSBuild resolved it, or null for anything else.</summary>
    private static Version? Framework(Project project)
    {
        if (
            project.GetPropertyValue("TargetFrameworks").Length > 0
            || project.GetPropertyValue("TargetFrameworkIdentifier") != NetCoreIdentifier
        )
            return null;

        return Version.TryParse(project.GetPropertyValue("TargetFrameworkVersion").TrimStart('v'), out var version)
            ? version
            : null;
    }

    private static bool ReferencesProject(Project project, string referencedPath) =>
        project
            .GetItems("ProjectReference")
            .Select(item => item.EvaluatedInclude.Replace('\\', Path.DirectorySeparatorChar))
            .Any(include => SamePath(Path.GetFullPath(include, project.DirectoryPath), referencedPath));

    /// <summary>
    /// Follows <c>TargetFramework</c> through properties that only forward another one
    /// (<c>$(AppTargetFramework)</c>) to the element holding the literal value, as long as that element
    /// is in a file inside the app repository.
    /// </summary>
    private static Edit? FindDefinition(Project project, string root)
    {
        var property = project.GetProperty("TargetFramework");
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (property?.Xml is { } element && visited.Add(property.Name))
        {
            var value = property.UnevaluatedValue.Trim();
            if (Regex.Match(value, @"^\$\(([A-Za-z_][\w.-]*)\)$") is { Success: true } forward)
            {
                property = project.GetProperty(forward.Groups[1].Value);
                continue;
            }

            var file = element.ContainingProject.FullPath;
            var isLiteral =
                !value.Contains('$', StringComparison.Ordinal)
                && !value.Contains('%', StringComparison.Ordinal)
                && !value.Contains('@', StringComparison.Ordinal);
            return isLiteral && IsInside(root, file)
                ? new Edit(file, element.Location.Line, property.Name, value)
                : null;
        }

        return null;
    }

    /// <summary>
    /// Edits only the value of the one element, so the rest of a file the service owner wrote keeps its
    /// layout and encoding.
    /// </summary>
    private static async Task ReplaceValue(Edit edit, string to)
    {
        var bytes = await File.ReadAllBytesAsync(edit.File);
        var preamble = Encoding.UTF8.Preamble;
        var hasBom = bytes.AsSpan().StartsWith(preamble);
        var content = Encoding.UTF8.GetString(hasBom ? bytes[preamble.Length..] : bytes);

        var lineStart = 0;
        for (var line = 1; line < edit.Line; line++)
            lineStart = content.IndexOf('\n', lineStart) + 1;

        var name = Regex.Escape(edit.Name);
        var pattern = new Regex(
            $@"(<{name}(\s[^>]*)?>\s*){Regex.Escape(edit.From)}(\s*</{name}>)",
            RegexOptions.CultureInvariant,
            TimeSpan.FromSeconds(1)
        );
        var updated = pattern.Replace(
            content,
            match => match.Groups[1].Value + to + match.Groups[3].Value,
            count: 1,
            startat: lineStart
        );

        await File.WriteAllTextAsync(edit.File, updated, new UTF8Encoding(hasBom));
    }

    private static bool IsInside(string root, string path)
    {
        var relative = Path.GetRelativePath(root, path);
        return !relative.StartsWith("..", StringComparison.Ordinal) && !Path.IsPathRooted(relative);
    }

    // App repositories are edited on Windows and macOS too, where paths ignore case.
    private static bool SamePath(string left, string right) =>
        string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
}
