using System.Text;
using System.Xml;
using System.Xml.Linq;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;
using NuGet.Versioning;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class AppVersionParser
{
    private const string FileRel = "App/App.csproj";
    private const int SupportedMajor = 9;

    private static readonly string[] _altinnPackages =
    {
        "Altinn.App.Api",
        "Altinn.App.Api.Experimental",
        "Altinn.App.Core",
    };

    private sealed record ProjectFile(XDocument Document, byte[] Data, string File);

    private sealed record PackageReference(XElement Element, string Include, ProjectFile Project);

    private sealed record DeclaredVersion(string? Spec, VersionRange? Range, string? Problem);

    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        var data = dir.ReadAllBytes(FileRel);
        if (data is null)
            return;
        var head = new SourceSpan(FileRel, "", 1, 1);
        if (LoadXml(data) is not { } doc)
        {
            app.UnsupportedAppVersion = new UnsupportedAppVersion(
                "could not determine the app's Altinn.App version (App/App.csproj is not valid XML)",
                head
            );
            return;
        }

        var appProject = new ProjectFile(doc, data, FileRel);
        var buildProps = LoadProjectFiles(ProjectImportFiles(dir, "Directory.Build.props"));
        var packagesProps = LoadProjectFiles(ProjectImportFiles(dir, "Directory.Packages.props").Take(1));
        var projectFiles = new List<ProjectFile> { appProject };
        projectFiles.AddRange(buildProps.Take(1));
        var properties = MsBuildProperties.Evaluate(
            Enumerable.Reverse(buildProps).Concat(packagesProps).Append(appProject).Select(project => project.Document)
        );

        var packageRefs = new List<PackageReference>();
        foreach (var project in projectFiles)
        {
            foreach (var e in project.Document.Descendants())
            {
                if (
                    e.Name.LocalName == "PackageReference"
                    && e.Attribute("Include")?.Value is { } inc
                    && _altinnPackages.Contains(inc, StringComparer.OrdinalIgnoreCase)
                )
                {
                    packageRefs.Add(new PackageReference(e, inc, project));
                }
            }
        }

        var resolvedSupported = false;
        string? resolvedVersion = null;
        (PackageReference Reference, string Problem)? firstUnresolved = null;
        foreach (var packageRef in packageRefs)
        {
            var declared = DeclaredVersionOf(packageRef, properties, packagesProps);
            if (declared is not { Spec: { } spec, Range: { } range })
            {
                firstUnresolved ??= (packageRef, declared.Problem ?? "has no resolvable version");
                continue;
            }
            if (ResolvesBelowSupportedMajor(range))
            {
                app.UnsupportedAppVersion = new UnsupportedAppVersion(
                    $"app declares {packageRef.Include} {spec}",
                    PositionOf(packageRef, head)
                );
                return;
            }
            resolvedSupported = true;
            resolvedVersion ??= LowestApplicableVersion(range);
        }
        if (resolvedSupported)
        {
            app.AltinnAppVersion = resolvedVersion;
            return;
        }

        if (firstUnresolved is ({ } unresolved, { } problem))
        {
            app.UnsupportedAppVersion = new UnsupportedAppVersion(
                $"could not determine the app's Altinn.App version (PackageReference \"{unresolved.Include}\" {problem})",
                PositionOf(unresolved, new SourceSpan(unresolved.Project.File, "", 1, 1))
            );
            return;
        }

        var sourceBuild = projectFiles.Any(project =>
            project
                .Document.Descendants()
                .Any(e =>
                    e.Name.LocalName == "ProjectReference"
                    && e.Attribute("Include")?.Value is { } inc
                    && _altinnPackages.Contains(
                        Path.GetFileNameWithoutExtension(inc.Replace('\\', '/')),
                        StringComparer.OrdinalIgnoreCase
                    )
                )
        );
        if (sourceBuild)
            return;

        app.UnsupportedAppVersion = new UnsupportedAppVersion(
            "could not determine the app's Altinn.App version (App/App.csproj has no Altinn.App package or project reference)",
            head
        );
    }

    private static List<ProjectFile> LoadProjectFiles(IEnumerable<(string File, byte[] Data)> files)
    {
        var projects = new List<ProjectFile>();
        foreach (var (file, data) in files)
        {
            if (LoadXml(data) is { } doc)
                projects.Add(new ProjectFile(doc, data, file));
        }
        return projects;
    }

    private static IEnumerable<(string File, byte[] Data)> ProjectImportFiles(IAppDirectory dir, string fileName)
    {
        foreach (var file in new[] { $"App/{fileName}", fileName })
        {
            if (dir.ReadAllBytes(file) is { } data)
                yield return (file, data);
        }

        var rel = new StringBuilder("../").Append(fileName);
        for (
            var current = Path.GetDirectoryName(Path.GetFullPath(dir.Root));
            !string.IsNullOrEmpty(current);
            current = Path.GetDirectoryName(current)
        )
        {
            var path = rel.ToString();
            if (dir.ReadExternalBytes(path) is { } data)
                yield return (path, data);
            rel.Insert(0, "../");
        }
    }

    private static DeclaredVersion DeclaredVersionOf(
        PackageReference packageRef,
        MsBuildProperties properties,
        List<ProjectFile> packagesProps
    )
    {
        var raw =
            packageRef.Element.Attribute("Version")?.Value
            ?? packageRef.Element.Elements().FirstOrDefault(e => e.Name.LocalName == "Version")?.Value;
        if (string.IsNullOrEmpty(raw))
            raw = CentralPackageVersion(packageRef.Include, packagesProps);
        if (string.IsNullOrEmpty(raw))
            return new DeclaredVersion(null, null, "has no version and no Directory.Packages.props entry");
        if (!properties.TryExpand(raw, out var spec, out var problem))
            return new DeclaredVersion(null, null, $"version \"{raw}\" {problem}");
        if (!VersionRange.TryParse(spec, allowFloating: true, out var range))
        {
            var expandedFrom = string.Equals(spec, raw, StringComparison.Ordinal) ? "" : $" (from \"{raw}\")";
            return new DeclaredVersion(
                null,
                null,
                $"version \"{spec}\"{expandedFrom} is not a NuGet version or version range"
            );
        }
        return new DeclaredVersion(spec, range, null);
    }

    private static string? CentralPackageVersion(string include, List<ProjectFile> packagesProps) =>
        packagesProps
            .SelectMany(project => project.Document.Descendants())
            .FirstOrDefault(e =>
                e.Name.LocalName == "PackageVersion"
                && string.Equals(e.Attribute("Include")?.Value, include, StringComparison.OrdinalIgnoreCase)
            )
            ?.Attribute("Version")
            ?.Value;

    private static bool ResolvesBelowSupportedMajor(VersionRange range)
    {
        if (
            range is
            {
                IsFloating: true,
                Float.FloatBehavior: NuGetVersionFloatBehavior.Major
                    or NuGetVersionFloatBehavior.PrereleaseMajor
                    or NuGetVersionFloatBehavior.AbsoluteLatest,
            }
        )
            return false;
        return range.MinVersion is not { } min || min.Major < SupportedMajor;
    }

    private static string? LowestApplicableVersion(VersionRange range) =>
        range is { IsFloating: false, IsMinInclusive: true, MinVersion: { } min } ? min.ToNormalizedString() : null;

    private static XDocument? LoadXml(byte[] data)
    {
        try
        {
            return XDocument.Parse(Encoding.UTF8.GetString(data), LoadOptions.SetLineInfo);
        }
        catch (XmlException)
        {
            return null;
        }
    }

    private static SourceSpan PositionOf(PackageReference packageRef, SourceSpan fallback)
    {
        var data = packageRef.Project.Data;
        var (line, col) = XmlPositions.LineCol(packageRef.Element as IXmlLineInfo, data, Spans.LineStarts(data));
        return line > 0 ? new SourceSpan(packageRef.Project.File, "", line, col) : fallback;
    }
}
