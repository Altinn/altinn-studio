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
    private readonly Dictionary<string, ProjectFile> _buildProps = new(StringComparer.Ordinal);
    private readonly Dictionary<string, ProjectFile> _packagesProps = new(StringComparer.Ordinal);
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

    // A malformed props file is as good as none, since MSBuild could not have imported it either.
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
            case (FileKind.BuildProps, { } props):
                _buildProps[path.Directory] = props;
                break;
            case (FileKind.PackagesProps, { } props):
                _packagesProps[path.Directory] = props;
                break;
        }
    }

    private ProjectDescription.WellFormed Describe(AppFilePath path, ProjectFile project)
    {
        ProjectFile? buildProps = Nearest(_buildProps, path.Directory);
        ProjectFile? packagesProps = Nearest(_packagesProps, path.Directory);

        // MSBuild imports Directory.Build.props, then Directory.Packages.props, then the project.
        var properties = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var packageVersions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (ProjectFile? file in new[] { buildProps, packagesProps, project })
        {
            if (file is null)
            {
                continue;
            }

            foreach (KeyValuePair<string, string> property in file.Properties)
            {
                properties[property.Key] = property.Value;
            }

            foreach (KeyValuePair<string, string> version in file.PackageVersions)
            {
                packageVersions[version.Key] = version.Value;
            }
        }

        var references = new List<PackageReference>();
        var indexByName = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (ProjectFile? file in new[] { buildProps, project })
        {
            if (file is null)
            {
                continue;
            }

            foreach (ProjectFile.Item item in file.PackageReferences)
            {
                string? declared = item.VersionOverride ?? item.Version;
                if (declared is null && packageVersions.TryGetValue(item.Name, out string? central))
                {
                    declared = central;
                }

                var reference = new PackageReference(
                    item.Name,
                    NormalizeVersion(ProjectFile.ExpandProperties(declared, properties))
                );
                if (indexByName.TryGetValue(item.Name, out int index))
                {
                    references[index] = reference;
                }
                else
                {
                    indexByName[item.Name] = references.Count;
                    references.Add(reference);
                }
            }
        }

        return new ProjectDescription.WellFormed(path, TargetFrameworks(properties), references);
    }

    private static List<string> TargetFrameworks(Dictionary<string, string> properties)
    {
        var frameworks = new List<string>();
        if (!properties.TryGetValue("TargetFrameworks", out string? value) || value.Trim().Length == 0)
        {
            properties.TryGetValue("TargetFramework", out value);
        }

        string? expanded = ProjectFile.ExpandProperties(value, properties);
        if (expanded is null)
        {
            return frameworks;
        }

        foreach (string framework in expanded.Split(';'))
        {
            if (framework.Trim().Length > 0)
            {
                frameworks.Add(framework.Trim());
            }
        }

        return frameworks;
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

    private static ProjectFile? Nearest(Dictionary<string, ProjectFile> files, string directory)
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
