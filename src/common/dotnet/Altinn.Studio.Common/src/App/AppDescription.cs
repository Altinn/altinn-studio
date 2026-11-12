using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Common.App.V8;
using Altinn.Studio.Common.App.V9;

namespace Altinn.Studio.Common.App;

/// <summary>
/// What an app's source files say about it: which kind of app it is, and for a form app which contract it is on for
/// the files that make it up. A case says only what the files prove.
/// </summary>
public abstract record AppDescription
{
    private AppDescription(ProjectDescription? appProject, ValueList<ProjectDescription> projects)
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
    public ValueList<ProjectDescription> Projects { get; }

    /// <summary>The first target framework of <see cref="AppProject"/>, such as <c>net8.0</c>.</summary>
    public string? TargetFramework =>
        AppProject is ProjectDescription.WellFormed { TargetFrameworks.Count: > 0 } project
            ? project.TargetFrameworks[0]
            : null;

    /// <summary>
    /// A form app: an app built on the Altinn.App libraries, with or without a user interface. It is the kind of app
    /// that Altinn Studio has. The files show one by a project that references an Altinn.App package, or by an index
    /// page that loads the app frontend.
    /// </summary>
    public abstract record FormApp : AppDescription
    {
        /// <summary>
        /// The last major version of the app frontend that an app loads from the CDN, which goes with Altinn.App v8.
        /// From v9 the backend serves the frontend itself.
        /// </summary>
        public const int LastV8FrontendMajor = 4;

        private FormApp(ProjectDescription? appProject, ValueList<ProjectDescription> projects)
            : base(appProject, projects) { }

        /// <summary>
        /// A form app on the contract of Altinn.App v8 and earlier. The package proves it, or else the index page
        /// does, by loading an app frontend of version <see cref="LastV8FrontendMajor"/> or lower.
        /// </summary>
        /// <param name="AppProject">The project the app is built from, if the repository shows which one it is.</param>
        /// <param name="Projects">Every project file in the repository.</param>
        /// <param name="AltinnApp">
        /// The Altinn.App package, or <c>null</c> when the index page is the proof: the app then gets Altinn.App
        /// through a package of its own, or with a version that names no major version.
        /// </param>
        /// <param name="V8">What only this contract has.</param>
        public sealed record V8OrEarlier(
            ProjectDescription? AppProject,
            ValueList<ProjectDescription> Projects,
            AltinnAppPackage? AltinnApp,
            V8Description V8
        ) : FormApp(AppProject, Projects);

        /// <summary>
        /// A form app on the contract of Altinn.App v9 and later, which the package proves and no index page
        /// contradicts.
        /// </summary>
        /// <param name="AppProject">The project the app is built from, if the repository shows which one it is.</param>
        /// <param name="Projects">Every project file in the repository.</param>
        /// <param name="AltinnApp">The Altinn.App package.</param>
        /// <param name="V9">What only this contract has.</param>
        public sealed record V9OrLater(
            ProjectDescription? AppProject,
            ValueList<ProjectDescription> Projects,
            AltinnAppPackage AltinnApp,
            V9Description V9
        ) : FormApp(AppProject, Projects);

        /// <summary>
        /// A form app whose files contradict each other, so that it is on no contract: the package is of v9 or
        /// later, and the index page loads an app frontend that goes with v8. An upgrade to v9 that kept a
        /// customized index page leaves an app like this.
        /// </summary>
        /// <param name="AppProject">The project the app is built from, if the repository shows which one it is.</param>
        /// <param name="Projects">Every project file in the repository.</param>
        /// <param name="AltinnApp">The Altinn.App package, of v9 or later.</param>
        /// <param name="FrontendVersion">
        /// The app frontend version the index page loads, of <see cref="LastV8FrontendMajor"/> or lower.
        /// </param>
        public sealed record Inconsistent(
            ProjectDescription? AppProject,
            ValueList<ProjectDescription> Projects,
            AltinnAppPackage AltinnApp,
            AppFrontendVersion FrontendVersion
        ) : FormApp(AppProject, Projects)
        {
            /// <summary>What contradicts what, in a few words.</summary>
            public string Reason =>
                $"{AltinnApp.Name} {AltinnApp.Version} does not go with app frontend {FrontendVersion}";
        }

        /// <summary>
        /// A form app whose contract the files do not show. A project references an Altinn.App package without a
        /// version that names a major version, or no project references one and the index page loads an app
        /// frontend later than <see cref="LastV8FrontendMajor"/>.
        /// </summary>
        /// <param name="AppProject">The project the app is built from, if the repository shows which one it is.</param>
        /// <param name="Projects">Every project file in the repository.</param>
        /// <param name="Reference">
        /// The reference to the Altinn.App package, or <c>null</c> when no project has one. Its version is
        /// <c>null</c> when it cannot be resolved, and is otherwise one that names no major version, such as a range.
        /// </param>
        /// <param name="FrontendVersion">
        /// The app frontend version the index page loads, or <c>null</c> when it names none.
        /// </param>
        public sealed record UnknownVersion(
            ProjectDescription? AppProject,
            ValueList<ProjectDescription> Projects,
            PackageReference? Reference,
            AppFrontendVersion? FrontendVersion
        ) : FormApp(AppProject, Projects)
        {
            /// <summary>Why the version is not known, in a few words.</summary>
            public string Reason =>
                Reference switch
                {
                    null => "no project references an Altinn.App package",
                    { Version: { } version } => $"the version of {Reference.Name}, {version}, names no major version",
                    _ => $"the version of {Reference.Name} cannot be resolved",
                };
        }
    }

    /// <summary>
    /// An app of no kind this model knows: no project references an Altinn.App package, and no index page loads the
    /// app frontend.
    /// </summary>
    /// <param name="AppProject">The project the app is built from, if the repository shows which one it is.</param>
    /// <param name="Projects">Every project file in the repository.</param>
    public sealed record Unrecognized(ProjectDescription? AppProject, ValueList<ProjectDescription> Projects)
        : AppDescription(AppProject, Projects);
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
        ValueList<string> TargetFrameworks,
        ValueList<PackageReference> PackageReferences
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

    // The major of a version that is not a semantic version but still names one: a NuGet version of one to four
    // numbers, such as 8 or 8.5, or a floating one, such as 8.* or 8.5.0-*. As in NuGet, a floating version has no
    // build metadata, and one whose numbers float has no pre-release or the pre-release *.
    private static int? ReadMajor(string version)
    {
        int plus = version.AsSpan().IndexOf('+');
        string withoutBuild = plus < 0 ? version : version.Substring(0, plus);
        int hyphen = withoutBuild.AsSpan().IndexOf('-');
        string[] numbers = (hyphen < 0 ? withoutBuild : withoutBuild.Substring(0, hyphen)).Split('.');
        string? preRelease = hyphen < 0 ? null : withoutBuild.Substring(hyphen + 1);
        bool numbersFloat = numbers[numbers.Length - 1] == "*";
        bool floats = withoutBuild.AsSpan().IndexOf('*') >= 0;
        bool valid =
            numbers.Length <= 4
            && (plus < 0 || (!floats && AreIdentifiers(version.Substring(plus + 1), floating: false)))
            && (preRelease is null || AreIdentifiers(preRelease, floating: true))
            && (!numbersFloat || preRelease is null or "*");
        for (int i = 0; valid && i < numbers.Length; i++)
        {
            valid = (numbersFloat && i > 0 && i == numbers.Length - 1) || IsNumber(numbers[i]);
        }

        return valid ? int.Parse(numbers[0], System.Globalization.CultureInfo.InvariantCulture) : null;
    }

    // At most six digits, which is more than any version has.
    private static bool IsNumber(string text)
    {
        foreach (char c in text)
        {
            if (!AsciiText.IsDigit(c))
            {
                return false;
            }
        }

        return text.Length is > 0 and <= 6;
    }

    // Identifiers of letters, digits and hyphens with dots between them. A floating version can end with *, alone
    // or after identifiers, as in -*, -rc.* and -rc*.
    private static bool AreIdentifiers(string identifiers, bool floating)
    {
        if (floating && identifiers.Length > 0 && identifiers[identifiers.Length - 1] == '*')
        {
            identifiers = identifiers.Substring(0, identifiers.Length - 1);
            if (identifiers.Length == 0)
            {
                return true;
            }

            if (identifiers[identifiers.Length - 1] == '.')
            {
                identifiers = identifiers.Substring(0, identifiers.Length - 1);
            }
        }

        foreach (string identifier in identifiers.Split('.'))
        {
            if (identifier.Length == 0)
            {
                return false;
            }

            foreach (char c in identifier)
            {
                if (!AsciiText.IsLetterOrDigit(c) && c != '-')
                {
                    return false;
                }
            }
        }

        return true;
    }
}
