using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Build.Evaluation;
using Microsoft.Build.Exceptions;
using Microsoft.Build.Locator;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Moves the projects that depend on the app project - in practice a service owner's own test projects -
/// to the app's target framework. A project cannot reference one built for a newer framework (NU1201),
/// so leaving them behind makes the whole solution fail to restore.
/// <para>
/// Projects are evaluated with MSBuild rather than read as XML, so a framework set through a property
/// (<c>$(AppTargetFramework)</c>), a <c>Directory.Build.props</c> or a condition is understood the way
/// <c>dotnet build</c> understands it, and is changed where it is defined. Every change is checked by
/// evaluating the project again, so the step never reports a move that did not take effect.
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

    private static readonly Regex _forwardPattern = new(
        @"^\$\(([A-Za-z_][\w.-]*)\)$",
        RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1)
    );

    // The "netX.Y" part of a framework, leaving any platform suffix such as "-windows".
    private static readonly Regex _netVersionPattern = new(
        @"^net\d+\.\d+",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase,
        TimeSpan.FromSeconds(1)
    );

    private static readonly Regex _xmlEncodingPattern = new(
        @"^\s*<\?xml[^>]*\bencoding\s*=\s*[""']([^""']+)[""']",
        RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1)
    );

    /// <summary>The element holding a literal framework value, located the way MSBuild reports it.</summary>
    private sealed record Definition(string File, int Line, int Column, string Name, string Value);

    private sealed record Move(string Name, Project Project, string From, Definition Definition, string Note);

    /// <returns>
    /// Returns 0 on success, 3 for manual follow up.
    /// </returns>
    internal static Task<int> Migrate(string projectFolder, string appProjectFile)
    {
        try
        {
            if (!MSBuildLocator.IsRegistered)
                MSBuildLocator.RegisterDefaults();
        }
        catch (InvalidOperationException ex)
        {
            UpgradeConsole.Todo(
                $"Could not find a .NET SDK to read the projects with ({ex.Message}). Make sure every project referencing the app project targets the app's framework."
            );
            return Task.FromResult(3);
        }

        // MSBuild types may only be loaded once the locator has registered them.
        return MigrateWithMSBuild(projectFolder, appProjectFile);
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private static async Task<int> MigrateWithMSBuild(string projectFolder, string appProjectFile)
    {
        var root = Path.GetFullPath(projectFolder);
        var appProjectPath = Path.GetFullPath(appProjectFile);
        using var projects = new ProjectCollection();

        Project app;
        try
        {
            app = projects.LoadProject(appProjectPath);
        }
        catch (InvalidProjectFileException ex)
        {
            UpgradeConsole.Todo(
                $"Could not read the app project: {ex.BaseMessage} Make sure every project referencing it targets the app's framework."
            );
            return 3;
        }

        var appFramework = _netVersionPattern.Match(app.GetPropertyValue("TargetFramework")).Value;
        if (Framework(app) is not { } target || appFramework.Length == 0)
        {
            UpgradeConsole.Skip("The app project does not target a single .NET framework");
            return 0;
        }

        var returnCode = 0;
        var loaded = new Dictionary<string, Project>(StringComparer.OrdinalIgnoreCase);
        foreach (var path in FindProjectFiles(root).Where(path => !SamePath(path, appProjectPath)))
        {
            try
            {
                loaded[path] = projects.LoadProject(path);
            }
            catch (InvalidProjectFileException ex)
            {
                UpgradeConsole.Todo(
                    $"Could not read {Path.GetRelativePath(root, path)}: {ex.BaseMessage} If it references the app project, make sure it targets {appFramework}."
                );
                returnCode = 3;
            }
        }

        var dependents = FindDependents(loaded, appProjectPath);
        if (dependents.Count == 0)
        {
            if (returnCode == 0)
                UpgradeConsole.Skip("No other projects reference the app project");
            return returnCode;
        }

        var dependentPaths = dependents.Select(project => project.FullPath).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var moves = new List<Move>();
        foreach (var project in dependents)
        {
            var name = Path.GetRelativePath(root, project.FullPath);
            if (project.GetPropertyValue("TargetFrameworks") is { Length: > 0 } frameworks)
            {
                UpgradeConsole.Todo(
                    $"{name} targets {frameworks}. Make sure each one is {appFramework} or later, as it depends on the app project."
                );
                returnCode = 3;
                continue;
            }

            var current = project.GetPropertyValue("TargetFramework");
            if (Framework(project) is not { } version)
            {
                UpgradeConsole.Todo(
                    $"{name} depends on the app project but targets '{current}'. Make sure it targets {appFramework} or later."
                );
                returnCode = 3;
                continue;
            }

            if (version >= target)
            {
                UpgradeConsole.Skip($"{name} already targets {current}");
                continue;
            }

            if (FindDefinition(project, root) is not { } definition)
            {
                UpgradeConsole.Todo(
                    $"{name} targets {current}, set outside the app repository or computed from other properties. Make it target {appFramework}."
                );
                returnCode = 3;
                continue;
            }

            moves.Add(
                new Move(
                    name,
                    project,
                    current,
                    definition,
                    DescribeSharedDefinition(definition, project, loaded, dependentPaths, root)
                )
            );
        }

        var applied = new HashSet<Definition>();
        var writeErrors = new Dictionary<Definition, string>();
        foreach (var definition in moves.Select(move => move.Definition).Distinct())
        {
            var (replaced, error) = await TryReplaceValue(definition, Retarget(definition.Value, appFramework));
            if (replaced)
                applied.Add(definition);
            else if (error is not null)
                writeErrors[definition] = error;
        }

        // Evaluate again rather than trust the edit: a later definition, a condition or markup the edit
        // could not see would otherwise leave the project behind while the step reports it moved.
        using var updated = new ProjectCollection();
        var results = moves
            .Select(move =>
                (
                    Move: move,
                    Moved: applied.Contains(move.Definition)
                        && Reevaluate(updated, move.Project.FullPath) is { } version
                        && version >= target
                )
            )
            .ToList();

        // An edit that moved none of its projects is undone, so a failed move leaves the files as they were.
        var leftChanged = new HashSet<Definition>();
        foreach (var definition in applied.Where(d => !results.Any(r => r.Moved && r.Move.Definition == d)))
        {
            var edited = definition with { Value = Retarget(definition.Value, appFramework) };
            if (!(await TryReplaceValue(edited, definition.Value)).Replaced)
                leftChanged.Add(definition);
        }

        foreach (var (move, moved) in results)
        {
            if (moved)
            {
                UpgradeConsole.Ok(
                    $"{move.Name} moved from {move.From} to {Retarget(move.From, appFramework)}{move.Note}"
                );
                continue;
            }

            var detail = "";
            if (writeErrors.TryGetValue(move.Definition, out var error))
                detail = $" ({error})";
            else if (leftChanged.Contains(move.Definition))
                detail = $", but {Path.GetRelativePath(root, move.Definition.File)} was changed anyway, so check it";
            UpgradeConsole.Todo(
                $"{move.Name} targets {move.From} and could not be changed automatically{detail}. Make it target {appFramework}, as it depends on the app project."
            );
            returnCode = 3;
        }

        return returnCode;
    }

    private static Version? Reevaluate(ProjectCollection projects, string path)
    {
        try
        {
            return Framework(projects.LoadProject(path));
        }
        catch (InvalidProjectFileException)
        {
            return null;
        }
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
                    AttributesToSkip = FileAttributes.Hidden | FileAttributes.System | FileAttributes.ReparsePoint,
                }
            )
            .Where(path => !BuildOutputPaths.IsBuildOutput(Path.GetRelativePath(root, path)))
            // Dot-folders such as .git only count as hidden on Unix.
            .Where(path => !IsInDotFolder(Path.GetRelativePath(root, path)))
            .Order(StringComparer.Ordinal);

    private static bool IsInDotFolder(string relativePath) =>
        relativePath
            .Split([Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar], StringSplitOptions.RemoveEmptyEntries)
            .SkipLast(1)
            .Any(segment => segment.StartsWith('.'));

    /// <summary>
    /// The projects that reference the app project, directly or through another project - a test project
    /// referencing shared test utilities that reference the app has to move as well.
    /// </summary>
    private static List<Project> FindDependents(Dictionary<string, Project> loaded, string appProjectPath)
    {
        var targets = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { appProjectPath };
        var dependents = new List<Project>();
        bool added;
        do
        {
            added = false;
            foreach (var (path, project) in loaded)
            {
                if (!targets.Contains(path) && ReferencesAny(project, targets))
                {
                    targets.Add(path);
                    dependents.Add(project);
                    added = true;
                }
            }
        } while (added);

        return [.. dependents.OrderBy(project => project.FullPath, StringComparer.Ordinal)];
    }

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

    private static bool ReferencesAny(Project project, HashSet<string> targets) =>
        project
            .GetItems("ProjectReference")
            .Select(item =>
                TryGetFullPath(item.EvaluatedInclude.Replace('\\', Path.DirectorySeparatorChar), project.DirectoryPath)
            )
            .Any(path => path is not null && targets.Contains(path));

    private static string? TryGetFullPath(string path, string basePath)
    {
        try
        {
            return Path.GetFullPath(path, basePath);
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
        {
            return null;
        }
    }

    /// <summary>
    /// Follows <c>TargetFramework</c> through properties that only forward another one
    /// (<c>$(AppTargetFramework)</c>) to the element holding the literal value, as long as that element
    /// is in a file inside the app repository.
    /// </summary>
    private static Definition? FindDefinition(Project project, string root)
    {
        var property = project.GetProperty("TargetFramework");
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        while (property?.Xml is { } element && visited.Add(property.Name))
        {
            var value = property.UnevaluatedValue.Trim();
            if (_forwardPattern.Match(value) is { Success: true } forward)
            {
                property = project.GetProperty(forward.Groups[1].Value);
                continue;
            }

            var file = element.ContainingProject.FullPath;
            var isLiteral = value.IndexOfAny(['$', '%', '@', ';']) < 0 && _netVersionPattern.IsMatch(value);
            return isLiteral && IsInside(root, file)
                ? new Definition(file, element.Location.Line, element.Location.Column, property.Name, value)
                : null;
        }

        return null;
    }

    /// <summary>
    /// Names the other projects found that take their framework from the same element in a shared file such
    /// as <c>Directory.Build.props</c>, so the report says the change reaches beyond the dependent project.
    /// Projects the search does not load, or that only build on the value, are not named.
    /// </summary>
    private static string DescribeSharedDefinition(
        Definition definition,
        Project project,
        Dictionary<string, Project> loaded,
        HashSet<string> dependentPaths,
        string root
    )
    {
        if (SamePath(definition.File, project.FullPath))
            return "";

        var others = loaded
            .Values.Where(other => !dependentPaths.Contains(other.FullPath))
            .Where(other => FindDefinition(other, root) == definition)
            .Select(other => Path.GetRelativePath(root, other.FullPath))
            .Order(StringComparer.Ordinal)
            .ToList();
        var file = Path.GetRelativePath(root, definition.File);
        return others.Count == 0 ? $" (set in {file})" : $" (set in {file}, also used by {string.Join(", ", others)})";
    }

    /// <summary>Swaps the <c>netX.Y</c> part and keeps a platform suffix: net8.0-windows becomes net10.0-windows.</summary>
    private static string Retarget(string framework, string to) =>
        to + framework[_netVersionPattern.Match(framework).Length..];

    /// <summary>
    /// Edits only the value of the one element MSBuild located, in the file's own encoding, so the rest of
    /// a file the service owner wrote stays as it was.
    /// </summary>
    /// <returns>
    /// Whether the value was found where MSBuild placed it and replaced, and why not when the file could
    /// not be written.
    /// </returns>
    private static async Task<(bool Replaced, string? Error)> TryReplaceValue(Definition definition, string to)
    {
        try
        {
            return (await ReplaceValue(definition, to), null);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return (false, $"could not write {Path.GetFileName(definition.File)}: {ex.Message}");
        }
    }

    private static async Task<bool> ReplaceValue(Definition definition, string to)
    {
        var bytes = await File.ReadAllBytesAsync(definition.File);
        if (DetectEncoding(bytes) is not { } detected)
            return false;
        var (encoding, preambleLength) = detected;

        string content;
        try
        {
            content = encoding.GetString(bytes, preambleLength, bytes.Length - preambleLength);
        }
        catch (DecoderFallbackException)
        {
            return false;
        }
        var lineStart = 0;
        for (var line = 1; line < definition.Line && lineStart >= 0; line++)
            lineStart = content.IndexOf('\n', lineStart) is var newline and >= 0 ? newline + 1 : -1;
        if (lineStart < 0)
            return false;

        var name = Regex.Escape(definition.Name);
        var pattern = new Regex(
            $@"\G<{name}(\s[^>]*)?>(\s*){Regex.Escape(definition.Value)}\s*</{name}>",
            RegexOptions.CultureInvariant,
            TimeSpan.FromSeconds(1)
        );
        // The element starts at the column MSBuild reports; matching only there, never searching on,
        // keeps a commented-out copy earlier in the file from being edited instead.
        var start = Math.Min(content.Length, lineStart + Math.Max(definition.Column - 1, 0));
        var match = pattern.Match(content, start);
        if (!match.Success)
            return false;

        var valueStart = match.Groups[2].Index + match.Groups[2].Length;
        var updated = string.Concat(
            content.AsSpan(0, valueStart),
            to,
            content.AsSpan(valueStart + definition.Value.Length)
        );

        await File.WriteAllBytesAsync(
            definition.File,
            [.. bytes.AsSpan(0, preambleLength), .. encoding.GetBytes(updated)]
        );
        return true;
    }

    /// <summary>
    /// The encoding a project file is written in: its byte order mark, else its XML declaration, else
    /// UTF-8. Null for a declared encoding this runtime cannot write, so the file is left alone.
    /// </summary>
    private static (Encoding Encoding, int PreambleLength)? DetectEncoding(byte[] bytes)
    {
        foreach (
            var encoding in new Encoding[]
            {
                new UTF8Encoding(true, throwOnInvalidBytes: true),
                new UnicodeEncoding(bigEndian: false, byteOrderMark: true),
                new UnicodeEncoding(bigEndian: true, byteOrderMark: true),
            }
        )
        {
            var preamble = encoding.GetPreamble();
            if (bytes.AsSpan().StartsWith(preamble))
                return (encoding, preamble.Length);
        }

        var declaration = _xmlEncodingPattern.Match(Encoding.ASCII.GetString(bytes, 0, Math.Min(bytes.Length, 200)));
        if (!declaration.Success)
            return (new UTF8Encoding(false, throwOnInvalidBytes: true), 0);

        try
        {
            return (Encoding.GetEncoding(declaration.Groups[1].Value), 0);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    private static bool IsInside(string root, string path)
    {
        var relative = Path.GetRelativePath(root, path);
        return !relative.StartsWith("..", StringComparison.Ordinal) && !Path.IsPathRooted(relative);
    }

    // Compared without case on every platform: two project files differing only in case would be a
    // broken repository on Windows and macOS anyway.
    private static bool SamePath(string left, string right) =>
        string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
}
