using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Common.App.V8;
using Altinn.Studio.Common.App.V9;

namespace Altinn.Studio.Common.App;

/// <summary>
/// What an app's source files say about it, as one case per contract for which files make up an app. An app is on the
/// v9 contract only when its project files prove it, and on the v8-or-earlier contract otherwise, as Designer decides.
/// </summary>
public abstract record AppDescription
{
    private AppDescription(ProjectDescription? appProject, IReadOnlyList<ProjectDescription> projects)
    {
        AppProject = appProject;
        Projects = projects;
    }

    /// <summary>
    /// The project the app is built from, or <c>null</c> when the repository does not show which one it is.
    /// </summary>
    /// <remarks>
    /// It is <c>App/App.csproj</c>, which the app template creates and its Dockerfile publishes. An app that has
    /// renamed it has one project in <c>App</c>, and that is then the one. Failing both, it is the repository's only
    /// project. Of the 1,252 apps deployed to production or tt02 in November 2026 whose repositories could be read,
    /// 1,248 have <c>App/App.csproj</c>, three have another single project in <c>App</c>, and one has a single
    /// project elsewhere.
    /// </remarks>
    public ProjectDescription? AppProject { get; }

    /// <summary>
    /// Every project file in the repository, in the order of their paths. They include <see cref="AppProject"/>, and
    /// test and library projects.
    /// </summary>
    public IReadOnlyList<ProjectDescription> Projects { get; }

    /// <summary>The first target framework of <see cref="AppProject"/>, such as <c>net8.0</c>.</summary>
    public string? TargetFramework =>
        AppProject is ProjectDescription.WellFormed { TargetFrameworks.Count: > 0 } project
            ? project.TargetFrameworks[0]
            : null;

    /// <summary>
    /// An app on the contract of Altinn.App v8 and earlier, which is every app whose project files do not prove v9,
    /// including apps that use Altinn.App through a package of their own and apps that do not use it at all.
    /// </summary>
    /// <param name="AppProject">The project the app is built from, if the repository shows which one it is.</param>
    /// <param name="Projects">Every project file in the repository.</param>
    /// <param name="AltinnApp">What the project files say about the Altinn.App package.</param>
    /// <param name="V8">What only this contract has.</param>
    public sealed record V8OrEarlier(
        ProjectDescription? AppProject,
        IReadOnlyList<ProjectDescription> Projects,
        AltinnAppDependency AltinnApp,
        V8Description V8
    ) : AppDescription(AppProject, Projects);

    /// <summary>An app whose project files reference Altinn.App v9 or later.</summary>
    /// <param name="AppProject">The project the app is built from, if the repository shows which one it is.</param>
    /// <param name="Projects">Every project file in the repository.</param>
    /// <param name="AltinnApp">The Altinn.App package.</param>
    /// <param name="V9">What only this contract has.</param>
    public sealed record V9OrLater(
        ProjectDescription? AppProject,
        IReadOnlyList<ProjectDescription> Projects,
        AltinnAppPackage AltinnApp,
        V9Description V9
    ) : AppDescription(AppProject, Projects);
}

/// <summary>What an app's project files say about the Altinn.App package it is built on, if any.</summary>
public abstract record AltinnAppDependency
{
    private AltinnAppDependency() { }

    /// <summary>A project references an Altinn.App package whose major version can be read.</summary>
    /// <param name="Package">The package.</param>
    public sealed record Known(AltinnAppPackage Package) : AltinnAppDependency;

    /// <summary>The project files do not say which Altinn.App version the app is built on.</summary>
    public abstract record Unknown : AltinnAppDependency
    {
        private Unknown() { }

        /// <summary>Why, in a few words.</summary>
        public abstract string Reason { get; }

        /// <summary>
        /// No project references an Altinn.App package. The app may use one through a package of its own, or not
        /// at all.
        /// </summary>
        public sealed record NotReferenced : Unknown
        {
            /// <inheritdoc />
            public override string Reason => "no project references an Altinn.App package";
        }

        /// <summary>A project references Altinn.App, but its version cannot be resolved.</summary>
        /// <param name="Reference">The reference, whose version is <c>null</c>.</param>
        public sealed record VersionNotResolved(PackageReference Reference) : Unknown
        {
            /// <inheritdoc />
            public override string Reason => $"the version of {Reference.Name} cannot be resolved";
        }

        /// <summary>A project references Altinn.App with a version that names no major version, such as a range.</summary>
        /// <param name="Reference">The reference.</param>
        public sealed record NoMajorVersion(PackageReference Reference) : Unknown
        {
            /// <inheritdoc />
            public override string Reason =>
                $"the version of {Reference.Name}, {Reference.Version}, names no major version";
        }
    }
}

/// <summary>A project file of an app.</summary>
public abstract record ProjectDescription
{
    private ProjectDescription(AppFilePath path)
    {
        Path = path;
    }

    /// <summary>The project file.</summary>
    public AppFilePath Path { get; }

    /// <summary>A project file that is well-formed XML.</summary>
    /// <param name="Path">The project file.</param>
    /// <param name="TargetFrameworks">From <c>TargetFramework</c> or <c>TargetFrameworks</c>.</param>
    /// <param name="PackageReferences">The packages the project references, in the order they are declared.</param>
    public sealed record WellFormed(
        AppFilePath Path,
        IReadOnlyList<string> TargetFrameworks,
        IReadOnlyList<PackageReference> PackageReferences
    ) : ProjectDescription(Path);

    /// <summary>A project file that is not well-formed XML, so nothing can be read from it.</summary>
    /// <param name="Path">The project file.</param>
    public sealed record Malformed(AppFilePath Path) : ProjectDescription(Path);
}

/// <summary>A NuGet package that a project references.</summary>
/// <param name="Name">The package ID, as written in the project.</param>
/// <param name="Version">
/// The version asked for, with properties and central package management resolved and an exact pin such as
/// <c>[8.0.0]</c> reduced to <c>8.0.0</c>, or <c>null</c> when it cannot be resolved.
/// </param>
public sealed record PackageReference(string Name, string? Version);

/// <summary>An Altinn.App package that a project references, with a version whose major is known.</summary>
public sealed record AltinnAppPackage
{
    private AltinnAppPackage(string name, string version, int major, SemanticVersion? semanticVersion)
    {
        Name = name;
        Version = version;
        Major = major;
        SemanticVersion = semanticVersion;
    }

    /// <summary>The Altinn.App packages, in the order an app's package is chosen from.</summary>
    public static IReadOnlyList<string> PackageNames { get; } =
    ["Altinn.App.Api", "Altinn.App.Api.Experimental", "Altinn.App.Core", "Altinn.App.Core.Experimental"];

    /// <summary>The package, such as <c>Altinn.App.Api</c> or <c>Altinn.App.Core.Experimental</c>.</summary>
    public string Name { get; }

    /// <summary>The version, as <see cref="PackageReference.Version"/> gives it.</summary>
    public string Version { get; }

    /// <summary>The major version, such as 8 for <c>8.5.0</c>.</summary>
    public int Major { get; }

    /// <summary>
    /// <see cref="Version"/> as a semantic version, or <c>null</c> when it names no single version, as a floating
    /// version such as <c>8.*</c> does.
    /// </summary>
    public SemanticVersion? SemanticVersion { get; }

    /// <summary>
    /// Reads a reference to one of <see cref="PackageNames"/> whose version names a major version, also a floating
    /// one, such as 8 from <c>8.5.0</c>, <c>8.0.0-preview.3</c> or <c>8.*</c>. A reference to any other package is
    /// not an Altinn.App package, whatever its version.
    /// </summary>
    public static bool TryParse(PackageReference reference, [NotNullWhen(true)] out AltinnAppPackage? package)
    {
        package = null;
        if (FindName(reference.Name) is not { } name || reference.Version is not { } version)
        {
            return false;
        }

        if (SemanticVersion.TryParse(version, out SemanticVersion? semanticVersion))
        {
            package = new AltinnAppPackage(name, version, semanticVersion.Major, semanticVersion);
        }
        else if (ReadMajor(version) is int major)
        {
            package = new AltinnAppPackage(name, version, major, null);
        }

        return package is not null;
    }

    /// <summary>
    /// Returns the name in <see cref="PackageNames"/> that a package ID is, in that casing, or <c>null</c> when the ID
    /// is not an Altinn.App package. NuGet compares package IDs without regard to case.
    /// </summary>
    internal static string? FindName(string packageId)
    {
        foreach (string name in PackageNames)
        {
            if (string.Equals(name, packageId, StringComparison.OrdinalIgnoreCase))
            {
                return name;
            }
        }

        return null;
    }

    // The major of a version that is not a semantic version but still names one, such as 8.* or 8.5.
    private static int? ReadMajor(string version)
    {
        int end = 0;
        int major = 0;
        while (end < version.Length && AsciiText.IsDigit(version[end]))
        {
            if (end >= 6)
            {
                return null;
            }

            major = (major * 10) + (version[end] - '0');
            end++;
        }

        if (end == 0 || (end < version.Length && version[end] is not ('.' or '-' or '+')))
        {
            return null;
        }

        return major;
    }
}
