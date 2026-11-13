using System;
using System.Collections.Generic;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// Reads an <see cref="AppDescription"/> from an app's project files, the <c>Directory.Build.props</c> and
/// <c>Directory.Packages.props</c> beside them, its index page and the settings files of its UI folders.
/// </summary>
/// <remarks>
/// Files arrive before the kind of app and its contract are known, so it reads what any case may need, and
/// <see cref="Build"/> picks the case. It guesses nothing, and says unknown where only MSBuild, NuGet or a browser
/// could say more.
/// A project gets the properties and package references of the nearest <c>Directory.Build.props</c> and the
/// central package versions of the nearest <c>Directory.Packages.props</c>, as MSBuild imports them. The app's
/// Altinn.App package is the first of <see cref="AltinnAppPackage.PackageNames"/> that
/// <see cref="AppDescription.AppProject"/> references, or else the first that a project it references does, since
/// the app's project may get it through a library project of its own. A project that the app's project does not
/// reference, such as its tests, says that the app is a form app but not which contract it is on.
/// Designer takes every app it cannot prove to be on v9 for one on v8, which is a decision for a caller to make.
/// </remarks>
public sealed class AppDescriptionReader : IAppSourceReader
{
    private const string AppFolder = "App";
    private const string AppProjectPath = "App/App.csproj";
    private const string BuildPropsName = "Directory.Build.props";
    private const string PackagesPropsName = "Directory.Packages.props";
    private const int LastV8Major = 8;

    // What describing one app may cost: an element applied to a project costs one, and so does each character of a
    // property's value and of the names an item lists. The project files of an app need a few thousand. Projects
    // past the limit are not read, so that a repository made to cost more does not.
    private const int MaxWork = 1_000_000;

    private readonly Dictionary<AppFilePath, ProjectFile> _projects = [];
    private readonly HashSet<AppFilePath> _malformedProjects = [];

    // By directory. A malformed file is null: MSBuild takes the nearest file, and could not have imported it.
    private readonly Dictionary<string, ProjectFile?> _buildProps = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ProjectFile?> _packagesProps = new(StringComparer.Ordinal);
    private readonly V9DescriptionReader _v9 = new();
    private AppFrontendVersion? _frontendVersion;

    private enum FileKind
    {
        Other,
        Project,
        BuildProps,
        PackagesProps,
    }

    /// <inheritdoc />
    public bool Accepts(AppFilePath path) =>
        Kind(path) != FileKind.Other || path.Is(AppFrontendVersionReader.IndexPath) || _v9.Accepts(path);

    /// <inheritdoc />
    public void Read(AppFilePath path, ReadOnlyMemory<byte> content)
    {
        if (path.Is(AppFrontendVersionReader.IndexPath))
        {
            _frontendVersion = AppFrontendVersionReader.Read(content);
        }
        else if (_v9.Accepts(path))
        {
            _v9.Read(path, content);
        }
        else if (Kind(path) != FileKind.Other)
        {
            Add(path, ProjectFile.TryParse(content, out ProjectFile? file) ? file : null);
        }
    }

    /// <inheritdoc />
    public void Read(AppFilePath path, string content)
    {
        if (path.Is(AppFrontendVersionReader.IndexPath))
        {
            _frontendVersion = AppFrontendVersionReader.Read(content);
        }
        else if (_v9.Accepts(path))
        {
            _v9.Read(path, content);
        }
        else if (Kind(path) != FileKind.Other)
        {
            Add(path, ProjectFile.TryParse(content, out ProjectFile? file) ? file : null);
        }
    }

    /// <summary>Describes the app from the files read so far.</summary>
    public AppDescription Build()
    {
        var paths = new List<AppFilePath>(_projects.Keys);
        paths.AddRange(_malformedProjects);
        paths.Sort((x, y) => string.CompareOrdinal(x.Value, y.Value));

        // Paths differ in case between apps written on Windows and the references to them.
        var byPath = new Dictionary<string, AppFilePath>(StringComparer.OrdinalIgnoreCase);
        foreach (AppFilePath path in paths)
        {
            byPath[path.Value] = path;
        }

        // The app's project is described first, so that it is read whatever else the repository holds.
        AppFilePath? appProjectPath = FindAppProject(paths);
        var budget = new WorkBudget(MaxWork);
        var described = new Dictionary<AppFilePath, ProjectDescription>(paths.Count);
        if (appProjectPath is not null)
        {
            described[appProjectPath] = Describe(appProjectPath, byPath, budget);
        }

        var projects = new ProjectDescription[paths.Count];
        for (int i = 0; i < paths.Count; i++)
        {
            if (!described.TryGetValue(paths[i], out ProjectDescription? project))
            {
                project = Describe(paths[i], byPath, budget);
                described[paths[i]] = project;
            }

            projects[i] = project;
        }

        ProjectDescription? appProject = appProjectPath is null ? null : described[appProjectPath];
        ValueList<ProjectDescription> all = [.. projects];
        PackageReference? reference = FindAltinnAppReference(appProject, described);
        AltinnAppPackage? package = null;
        _ = reference is not null && AltinnAppPackage.TryParse(reference, out package);
        AppFrontendVersion? frontend = _frontendVersion;
        bool frontendOfV8 = frontend is { Major: <= AppDescription.FormApp.LastV8FrontendMajor };

        // The package says which contract the app is on. A page that loads an app frontend of v8 contradicts a
        // package of v9, and is the proof of v8 when the repository has no reference to Altinn.App at all.
        if (reference is not null && package is { Major: > LastV8Major })
        {
            return frontend is not null && frontendOfV8
                ? new AppDescription.FormApp.Inconsistent(appProject, all, reference, frontend, package)
                : new AppDescription.FormApp.V9OrLater(appProject, all, reference, frontend, package, _v9.Build());
        }

        if (package is not null)
        {
            return new AppDescription.FormApp.V8OrEarlier(appProject, all, reference, frontend, package);
        }

        if (reference is not null)
        {
            return Unknown(
                reference.Version is null
                    ? UnknownContractReason.VersionNotResolved
                    : UnknownContractReason.NoMajorVersion
            );
        }

        if (AnyReferencesAltinnApp(projects))
        {
            return Unknown(UnknownContractReason.NotReferencedByAppProject);
        }

        if (frontendOfV8)
        {
            return new AppDescription.FormApp.V8OrEarlier(appProject, all, null, frontend, null);
        }

        return frontend is not null
            ? Unknown(UnknownContractReason.FrontendNotOfV8)
            : new AppDescription.Unrecognized(appProject, all);

        AppDescription.FormApp.UnknownContract Unknown(UnknownContractReason reason) =>
            new(appProject, all, reference, frontend, reason);
    }

    private static FileKind Kind(AppFilePath path)
    {
        if (path.FileName.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
        {
            return FileKind.Project;
        }

        if (string.Equals(path.FileName, BuildPropsName, StringComparison.OrdinalIgnoreCase))
        {
            return FileKind.BuildProps;
        }

        return string.Equals(path.FileName, PackagesPropsName, StringComparison.OrdinalIgnoreCase)
            ? FileKind.PackagesProps
            : FileKind.Other;
    }

    // A file that is read again replaces what the earlier read gave.
    private void Add(AppFilePath path, ProjectFile? file)
    {
        switch (Kind(path), file)
        {
            case (FileKind.Project, null):
                _projects.Remove(path);
                _malformedProjects.Add(path);
                break;
            case (FileKind.Project, { } project):
                _malformedProjects.Remove(path);
                _projects[path] = project;
                break;
            case (FileKind.BuildProps, _):
                _buildProps[path.Directory] = file;
                break;
            case (FileKind.PackagesProps, _):
                _packagesProps[path.Directory] = file;
                break;
        }
    }

    private ProjectDescription Describe(
        AppFilePath path,
        Dictionary<string, AppFilePath> projectsByPath,
        WorkBudget budget
    )
    {
        if (!_projects.TryGetValue(path, out ProjectFile? project))
        {
            return new ProjectDescription.Malformed(path);
        }

        // MSBuild imports Directory.Build.props, then Directory.Packages.props, then the project. It sets every
        // property before it reads an item, so an item gets the values the properties have in the end.
        ProjectFile?[] files = [Nearest(_buildProps, path.Directory), Nearest(_packagesProps, path.Directory), project];
        var properties = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var packageVersions = new PackageItems();
        var packageReferences = new PackageItems();
        foreach (ProjectFile? file in files)
        {
            if (file is not null && !file.SetProperties(properties, budget))
            {
                return new ProjectDescription.NotRead(path);
            }
        }

        foreach (ProjectFile? file in files)
        {
            if (file is null)
            {
                continue;
            }

            if (
                !packageVersions.Apply(file.PackageVersions, budget)
                || !packageReferences.Apply(file.PackageReferences, budget)
            )
            {
                return new ProjectDescription.NotRead(path);
            }
        }

        // Without central package management, NuGet ignores the central versions and VersionOverride. A version
        // that is not known stays so, and does not fall back to another.
        bool central =
            properties.TryGetValue("ManagePackageVersionsCentrally", out string? manage)
            && string.Equals(manage?.Trim(), "true", StringComparison.OrdinalIgnoreCase);
        var references = new List<PackageReference>(packageReferences.Included.Count);
        foreach (PackageItems.Entry reference in packageReferences.Included)
        {
            string? declared = null;
            if (!packageReferences.IsUnknown(reference))
            {
                declared = NullIfEmpty(reference.Version);
                if (central)
                {
                    declared =
                        NullIfEmpty(reference.VersionOverride) ?? declared ?? packageVersions.Version(reference.Name);
                }
            }

            references.Add(
                new PackageReference(reference.Name, NormalizeVersion(ProjectFile.Expand(declared, properties)))
            );
        }

        List<AppFilePath>? projectReferences = ProjectReferences(path, project, projectsByPath, budget);
        return projectReferences is null
            ? new ProjectDescription.NotRead(path)
            : new ProjectDescription.WellFormed(
                path,
                [.. TargetFrameworks(properties)],
                [.. references],
                [.. projectReferences]
            );
    }

    // The projects in the repository that a project references, or null when the budget does not cover them. A
    // reference that a condition decides is left out, and so is one whose path has a property or a pattern in it,
    // since where it leads is not known here.
    private static List<AppFilePath>? ProjectReferences(
        AppFilePath path,
        ProjectFile project,
        Dictionary<string, AppFilePath> projectsByPath,
        WorkBudget budget
    )
    {
        var references = new List<AppFilePath>();
        var seen = new HashSet<AppFilePath>();
        foreach (ProjectFile.Item item in project.ProjectReferences)
        {
            if (!budget.Spend(1 + item.Name.Length))
            {
                return null;
            }

            if (item.Conditional || item.Operation != ProjectFile.Operation.Include)
            {
                continue;
            }

            foreach (string part in item.Name.Split(';'))
            {
                // A path is resolved only when it is written out, since .. would otherwise take a property away.
                if (
                    !IsExpression(part)
                    && Resolve(path.Directory, part.Trim()) is { } resolved
                    && projectsByPath.TryGetValue(resolved, out AppFilePath? referenced)
                    && seen.Add(referenced)
                )
                {
                    references.Add(referenced);
                }
            }
        }

        return references;
    }

    // The path that a project reference leads to, relative to the app's root, or null when it leads out of the app.
    // Projects written on Windows separate the segments with \.
    private static string? Resolve(string directory, string reference)
    {
        var segments = new List<string>();
        if (directory.Length > 0)
        {
            segments.AddRange(directory.Split('/'));
        }

        foreach (string segment in reference.Split('/', '\\'))
        {
            if (segment == "..")
            {
                if (segments.Count == 0)
                {
                    return null;
                }

                segments.RemoveAt(segments.Count - 1);
            }
            else if (segment.Length > 0 && segment != ".")
            {
                segments.Add(segment);
            }
        }

        return string.Join("/", segments);
    }

    private static List<string> TargetFrameworks(Dictionary<string, string?> properties)
    {
        var frameworks = new List<string>();
        if (!properties.TryGetValue("TargetFrameworks", out string? value) || value?.Trim().Length == 0)
        {
            properties.TryGetValue("TargetFramework", out value);
        }

        if (value is null)
        {
            return frameworks;
        }

        foreach (string framework in value.Split(';'))
        {
            if (framework.Trim().Length > 0)
            {
                frameworks.Add(framework.Trim());
            }
        }

        return frameworks;
    }

    private static string? NullIfEmpty(string? value) => string.IsNullOrEmpty(value) ? null : value;

    // Whether MSBuild expands the text, as a property, an item list, metadata or a pattern over files.
    private static bool IsExpression(string value) => value.AsSpan().IndexOfAny("*?@$%".AsSpan()) >= 0;

    // The items of one kind that the files include, in the order they are first included. The version of an item is
    // known only when one element names it, an Include without a condition. What an Update, a Remove, a second
    // Include or a condition leaves is for MSBuild and NuGet to say, so it is unknown here.
    private sealed class PackageItems
    {
        private readonly Dictionary<string, Entry> _byName = new(StringComparer.OrdinalIgnoreCase);

        // The items included before this many were have a version that is not known.
        private int _unknownBefore;

        public List<Entry> Included { get; } = [];

        public bool IsUnknown(Entry entry) => entry.IsUnknown || entry.Number < _unknownBefore;

        // The version of a package, or null when it has none or it is not known.
        public string? Version(string name) =>
            _byName.TryGetValue(name, out Entry? entry) && entry.Number >= 0 && !IsUnknown(entry)
                ? NullIfEmpty(entry.Version)
                : null;

        // Applies the elements in order, or returns false when the budget does not cover them. An element lists
        // up to as many names as it has characters, so those are what it costs.
        public bool Apply(IReadOnlyList<ProjectFile.Item> items, WorkBudget budget)
        {
            foreach (ProjectFile.Item item in items)
            {
                if (!budget.Spend(1 + item.Name.Length))
                {
                    return false;
                }

                Apply(item);
            }

            return true;
        }

        private void Apply(ProjectFile.Item item)
        {
            // An element names one package, several with ; between them, or a pattern such as @(PackageReference).
            // What a pattern matches is not known here, so it leaves the version of every item so far unknown.
            if (IsExpression(item.Name))
            {
                if (item.Operation != ProjectFile.Operation.Include)
                {
                    _unknownBefore = Included.Count;
                }

                return;
            }

            foreach (string part in item.Name.Split(';'))
            {
                string name = part.Trim();
                if (name.Length > 0)
                {
                    Apply(item, name);
                }
            }
        }

        private void Apply(ProjectFile.Item item, string name)
        {
            bool include = item.Operation == ProjectFile.Operation.Include;
            if (_byName.TryGetValue(name, out Entry? entry))
            {
                entry.IsUnknown = true;
            }
            else
            {
                entry = new Entry(name, item.Version, item.VersionOverride)
                {
                    IsUnknown = !include || item.Conditional,
                };
                _byName[name] = entry;
            }

            if (include && entry.Number < 0)
            {
                entry.Number = Included.Count;
                Included.Add(entry);
            }
        }

        public sealed class Entry(string name, string? version, string? versionOverride)
        {
            public string Name { get; } = name;

            public string? Version { get; } = version;

            public string? VersionOverride { get; } = versionOverride;

            public bool IsUnknown { get; set; }

            // How many items were included before this one, or -1 while no element has included it.
            public int Number { get; set; } = -1;
        }
    }

    // App/App.csproj is what the app template creates and its Dockerfile publishes. An app that has renamed it has one
    // project in App. Failing both, the only project in the repository is the one that is built.
    private static AppFilePath? FindAppProject(List<AppFilePath> projects)
    {
        AppFilePath? onlyInAppFolder = null;
        int inAppFolder = 0;
        foreach (AppFilePath project in projects)
        {
            if (project.Is(AppProjectPath))
            {
                return project;
            }

            if (string.Equals(project.Directory, AppFolder, StringComparison.OrdinalIgnoreCase))
            {
                onlyInAppFolder = project;
                inAppFolder++;
            }
        }

        if (inAppFolder == 1)
        {
            return onlyInAppFolder;
        }

        return inAppFolder == 0 && projects.Count == 1 ? projects[0] : null;
    }

    // The Altinn.App reference of the app's project, or else of the nearest project it references, also through
    // other projects.
    private static PackageReference? FindAltinnAppReference(
        ProjectDescription? appProject,
        Dictionary<AppFilePath, ProjectDescription> projects
    )
    {
        if (appProject is null)
        {
            return null;
        }

        var seen = new HashSet<AppFilePath> { appProject.Path };
        var queue = new Queue<ProjectDescription>();
        queue.Enqueue(appProject);
        while (queue.Count > 0)
        {
            ProjectDescription project = queue.Dequeue();
            if (FindAltinnAppReference(project) is { } reference)
            {
                return reference;
            }

            if (project is not ProjectDescription.WellFormed wellFormed)
            {
                continue;
            }

            foreach (AppFilePath path in wellFormed.ProjectReferences)
            {
                if (seen.Add(path) && projects.TryGetValue(path, out ProjectDescription? referenced))
                {
                    queue.Enqueue(referenced);
                }
            }
        }

        return null;
    }

    private static bool AnyReferencesAltinnApp(ProjectDescription[] projects)
    {
        foreach (ProjectDescription project in projects)
        {
            if (FindAltinnAppReference(project) is not null)
            {
                return true;
            }
        }

        return false;
    }

    private static PackageReference? FindAltinnAppReference(ProjectDescription project)
    {
        if (project is not ProjectDescription.WellFormed wellFormed)
        {
            return null;
        }

        foreach (string name in AltinnAppPackage.PackageNames)
        {
            foreach (PackageReference reference in wellFormed.PackageReferences)
            {
                if (string.Equals(reference.Name, name, StringComparison.OrdinalIgnoreCase))
                {
                    return reference with { Name = name };
                }
            }
        }

        return null;
    }

    // An exact pin such as [8.0.0] is the version it pins. Other ranges stay as written.
    private static string? NormalizeVersion(string? version)
    {
        string? trimmed = version?.Trim();
        if (trimmed is null || trimmed.Length == 0)
        {
            return null;
        }

        if (
            trimmed.Length > 2
            && trimmed[0] == '['
            && trimmed[trimmed.Length - 1] == ']'
            && trimmed.AsSpan().IndexOf(',') < 0
        )
        {
            string pinned = trimmed.Substring(1, trimmed.Length - 2).Trim();
            return pinned.Length == 0 ? null : pinned;
        }

        return trimmed;
    }

    // The file of the nearest directory that has one, which is null when that file is malformed.
    private static ProjectFile? Nearest(Dictionary<string, ProjectFile?> files, string directory)
    {
        while (true)
        {
            if (files.TryGetValue(directory, out ProjectFile? file))
            {
                return file;
            }

            if (directory.Length == 0)
            {
                return null;
            }

            int slash = directory.LastIndexOf('/');
            directory = slash < 0 ? string.Empty : directory.Substring(0, slash);
        }
    }
}
