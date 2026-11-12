using System;
using System.Collections.Generic;
using Altinn.Studio.Common.App.V8;
using Altinn.Studio.Common.App.V9;

namespace Altinn.Studio.Common.App;

/// <summary>
/// Reads an <see cref="AppDescription"/> from an app's project files, the <c>Directory.Build.props</c> and
/// <c>Directory.Packages.props</c> beside them, and the files each version's part needs.
/// </summary>
/// <remarks>
/// Files arrive before the kind of app and its version are known, so it reads what every version's part may need,
/// and <see cref="Build"/> picks the case. It guesses nothing: an app is a form app only when a project references
/// an Altinn.App package, and on a version's contract only when that reference names the major version. Designer
/// takes every app it cannot prove to be on v9 for one on v8, which is a decision for a caller to make.
/// A project gets the properties and package references of the nearest <c>Directory.Build.props</c> and the
/// central package versions of the nearest <c>Directory.Packages.props</c>, as MSBuild imports them. The app's
/// Altinn.App package is the first of <see cref="AltinnAppPackage.PackageNames"/> that
/// <see cref="AppDescription.AppProject"/> references, or else the first that another project references, since the
/// app's project may get it through a library project of its own.
/// </remarks>
public sealed class AppDescriptionReader : IAppSourceReader
{
    private const string AppFolder = "App";
    private const string AppProjectPath = "App/App.csproj";
    private const string BuildPropsName = "Directory.Build.props";
    private const string PackagesPropsName = "Directory.Packages.props";
    private const int LastV8Major = 8;

    private readonly Dictionary<AppFilePath, ProjectFile> _projects = [];
    private readonly HashSet<AppFilePath> _malformedProjects = [];

    // By directory. A malformed file is null: MSBuild takes the nearest file, and could not have imported it.
    private readonly Dictionary<string, ProjectFile?> _buildProps = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ProjectFile?> _packagesProps = new(StringComparer.Ordinal);
    private readonly V8DescriptionReader _v8 = new();
    private readonly V9DescriptionReader _v9 = new();

    private enum FileKind
    {
        Other,
        Project,
        BuildProps,
        PackagesProps,
    }

    /// <inheritdoc />
    public bool Accepts(AppFilePath path) => Kind(path) != FileKind.Other || _v8.Accepts(path) || _v9.Accepts(path);

    /// <inheritdoc />
    public void Read(AppFilePath path, ReadOnlyMemory<byte> content)
    {
        ReadVersionParts(path, reader => reader.Read(path, content));
        if (Kind(path) != FileKind.Other)
        {
            Add(path, ProjectFile.TryParse(content, out ProjectFile? file) ? file : null);
        }
    }

    /// <inheritdoc />
    public void Read(AppFilePath path, string content)
    {
        ReadVersionParts(path, reader => reader.Read(path, content));
        if (Kind(path) != FileKind.Other)
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

        var projects = new List<ProjectDescription>(paths.Count);
        foreach (AppFilePath path in paths)
        {
            projects.Add(
                _projects.TryGetValue(path, out ProjectFile? file)
                    ? Describe(path, file)
                    : new ProjectDescription.Malformed(path)
            );
        }

        ProjectDescription? appProject = FindAppProject(projects);
        return FindAltinnAppReference(appProject, projects) switch
        {
            null => new AppDescription.Unrecognized(appProject, projects),
            { } reference when AltinnAppPackage.TryParse(reference, out AltinnAppPackage? package) => package.Major
            > LastV8Major
                ? new AppDescription.FormApp.V9OrLater(appProject, projects, package, _v9.Build())
                : new AppDescription.FormApp.V8OrEarlier(appProject, projects, package, _v8.Build()),
            { } reference => new AppDescription.FormApp.UnknownVersion(appProject, projects, reference),
        };
    }

    private void ReadVersionParts(AppFilePath path, Action<IAppSourceReader> read)
    {
        foreach (IAppSourceReader reader in new IAppSourceReader[] { _v8, _v9 })
        {
            if (reader.Accepts(path))
            {
                read(reader);
            }
        }
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

    private ProjectDescription.WellFormed Describe(AppFilePath path, ProjectFile project)
    {
        // MSBuild imports Directory.Build.props, then Directory.Packages.props, then the project. It sets every
        // property before it reads an item, so an item gets the values the properties have in the end.
        ProjectFile?[] files = [Nearest(_buildProps, path.Directory), Nearest(_packagesProps, path.Directory), project];
        var properties = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var packageVersions = new PackageItems();
        var packageReferences = new PackageItems();
        foreach (ProjectFile? file in files)
        {
            file?.SetProperties(properties);
        }

        foreach (ProjectFile? file in files)
        {
            if (file is null)
            {
                continue;
            }

            foreach (ProjectFile.Item item in file.PackageVersions)
            {
                packageVersions.Apply(item);
            }

            foreach (ProjectFile.Item item in file.PackageReferences)
            {
                packageReferences.Apply(item);
            }
        }

        // Without central package management, NuGet ignores the central versions and VersionOverride. A version
        // that is not known stays so, and does not fall back to another.
        bool central =
            properties.TryGetValue("ManagePackageVersionsCentrally", out string? manage)
            && string.Equals(manage?.Trim(), "true", StringComparison.OrdinalIgnoreCase);
        var references = new List<PackageReference>();
        foreach (PackageItems.Entry reference in packageReferences.Entries)
        {
            if (reference.IsRemoved)
            {
                continue;
            }

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

        return new ProjectDescription.WellFormed(path, TargetFrameworks(properties), references);
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

    // The items of one kind, as the elements of the files leave them, in the order they were included. Each element
    // is applied in constant time, so that a file with many of them is read in time linear in its size.
    private sealed class PackageItems
    {
        private readonly Dictionary<string, Entry> _byName = new(StringComparer.OrdinalIgnoreCase);

        // The entries added before this many were added have a version that is not known.
        private int _unknownBefore;

        public List<Entry> Entries { get; } = [];

        public bool IsUnknown(Entry entry) => entry.IsUnknown || entry.Number < _unknownBefore;

        // The version of a package, or null when it has none or it is not known.
        public string? Version(string name) =>
            _byName.TryGetValue(name, out Entry? entry) && !IsUnknown(entry) ? NullIfEmpty(entry.Version) : null;

        public void Apply(ProjectFile.Item item)
        {
            // An element names one package, several with ; between them, or a pattern such as @(PackageReference).
            // What a pattern matches is not known here, so it leaves the version of every item so far unknown.
            if (item.Name.AsSpan().IndexOfAny("*?@$%".AsSpan()) >= 0)
            {
                if (item.Operation != ProjectFile.Operation.Include)
                {
                    _unknownBefore = Entries.Count;
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
            if (!_byName.TryGetValue(name, out Entry? entry))
            {
                if (item.Operation == ProjectFile.Operation.Include)
                {
                    entry = new Entry(name, Entries.Count)
                    {
                        Version = item.Version,
                        VersionOverride = item.VersionOverride,
                        IsUnknown = item.Conditional,
                    };
                    _byName[name] = entry;
                    Entries.Add(entry);
                }

                return;
            }

            // Whether a condition holds is not known here, so neither is what a conditional element leaves.
            if (item.Conditional)
            {
                entry.IsUnknown = true;
            }
            else if (item.Operation == ProjectFile.Operation.Remove)
            {
                entry.IsRemoved = true;
                _byName.Remove(name);
            }
            else if (item.Operation == ProjectFile.Operation.Update)
            {
                entry.Version = item.Version ?? entry.Version;
                entry.VersionOverride = item.VersionOverride ?? entry.VersionOverride;
            }
            else if (
                !string.Equals(NullIfEmpty(item.Version), NullIfEmpty(entry.Version), StringComparison.Ordinal)
                || !string.Equals(
                    NullIfEmpty(item.VersionOverride),
                    NullIfEmpty(entry.VersionOverride),
                    StringComparison.Ordinal
                )
            )
            {
                // MSBuild keeps both items of a package that is included twice, and NuGet then warns and picks one.
                entry.IsUnknown = true;
            }
        }

        public sealed class Entry(string name, int number)
        {
            public string Name { get; } = name;

            // How many entries were added before this one.
            public int Number { get; } = number;

            public string? Version { get; set; }

            public string? VersionOverride { get; set; }

            public bool IsUnknown { get; set; }

            public bool IsRemoved { get; set; }
        }
    }

    // App/App.csproj is what the app template creates and its Dockerfile publishes. An app that has renamed it has one
    // project in App. Failing both, the only project in the repository is the one that is built.
    private static ProjectDescription? FindAppProject(List<ProjectDescription> projects)
    {
        ProjectDescription? onlyInAppFolder = null;
        int inAppFolder = 0;
        foreach (ProjectDescription project in projects)
        {
            if (project.Path.Is(AppProjectPath))
            {
                return project;
            }

            if (string.Equals(project.Path.Directory, AppFolder, StringComparison.OrdinalIgnoreCase))
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

    private static PackageReference? FindAltinnAppReference(
        ProjectDescription? appProject,
        List<ProjectDescription> projects
    )
    {
        if (appProject is not null && FindAltinnAppReference(appProject) is { } ofAppProject)
        {
            return ofAppProject;
        }

        foreach (ProjectDescription project in projects)
        {
            if (!ReferenceEquals(project, appProject) && FindAltinnAppReference(project) is { } reference)
            {
                return reference;
            }
        }

        return null;
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
