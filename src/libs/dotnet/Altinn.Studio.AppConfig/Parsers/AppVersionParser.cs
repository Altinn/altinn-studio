using System.Buffers;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

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

    private static readonly SearchValues<char> _majorTerminators = SearchValues.Create(".-");

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

        var projectFiles = ProjectFiles(doc, data, dir);

        var packageRefs = new List<(XElement Element, string Include, XDocument Document, byte[] Data, string File)>();
        foreach (var (projectDoc, projectData, projectFile) in projectFiles)
        foreach (var e in projectDoc.Descendants())
        {
            if (
                e.Name.LocalName == "PackageReference"
                && e.Attribute("Include")?.Value is { } inc
                && _altinnPackages.Contains(inc, StringComparer.OrdinalIgnoreCase)
            )
            {
                packageRefs.Add((e, inc, projectDoc, projectData, projectFile));
            }
        }

        var resolvedSupported = false;
        foreach (var (pr, include, projectDoc, projectData, projectFile) in packageRefs)
        {
            var version = ResolveVersion(pr, include, projectDoc, dir);
            if (version is null || !TryMajor(version, out var major))
                continue;
            if (major < SupportedMajor)
            {
                app.UnsupportedAppVersion = new UnsupportedAppVersion(
                    $"app declares {include} {version}",
                    PositionOf(pr, projectData, projectFile, head)
                );
                return;
            }
            resolvedSupported = true;
        }
        if (resolvedSupported)
            return;

        if (packageRefs.Count > 0)
        {
            var first = packageRefs[0];
            app.UnsupportedAppVersion = new UnsupportedAppVersion(
                $"could not determine the app's Altinn.App version (PackageReference \"{first.Include}\" has no resolvable version)",
                PositionOf(first.Element, first.Data, first.File, new SourceSpan(first.File, "", 1, 1))
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

    private static List<(XDocument Document, byte[] Data, string File)> ProjectFiles(
        XDocument appProject,
        byte[] appProjectData,
        IAppDirectory dir
    )
    {
        var files = new List<(XDocument Document, byte[] Data, string File)> { (appProject, appProjectData, FileRel) };
        foreach (var file in DirectoryBuildProps(dir))
        {
            if (ReadProjectFile(dir, file) is { } data && LoadXml(data) is { } doc)
                files.Add((doc, data, file));
        }
        return files;
    }

    private static byte[]? ReadProjectFile(IAppDirectory dir, string relativePath)
    {
        if (dir.ReadAllBytes(relativePath) is { } data)
            return data;
        if (!Directory.Exists(dir.Root))
            return null;
        var fullPath = Path.GetFullPath(Path.Combine(dir.Root, relativePath));
        return File.Exists(fullPath) ? File.ReadAllBytes(fullPath) : null;
    }

    private static IEnumerable<string> DirectoryBuildProps(IAppDirectory dir)
    {
        foreach (var file in new[] { "App/Directory.Build.props", "Directory.Build.props" })
        {
            if (dir.Exists(file))
            {
                yield return file;
                yield break;
            }
        }

        if (!Directory.Exists(dir.Root))
            yield break;

        var root = Path.GetFullPath(dir.Root);
        for (
            var current = Directory.GetParent(Path.Combine(root, "App"));
            current is not null;
            current = current.Parent
        )
        {
            if (string.Equals(current.FullName, root, StringComparison.Ordinal))
                continue;
            var path = Path.Combine(current.FullName, "Directory.Build.props");
            if (!File.Exists(path))
                continue;
            var rel = Path.GetRelativePath(root, path).Replace('\\', '/');
            yield return rel;
            yield break;
        }
    }

    private static string? ResolveVersion(XElement packageRef, string include, XDocument csproj, IAppDirectory dir)
    {
        var raw =
            packageRef.Attribute("Version")?.Value
            ?? packageRef.Elements().FirstOrDefault(e => e.Name.LocalName == "Version")?.Value;
        if (string.IsNullOrEmpty(raw))
            return CentralPackageVersion(include, dir);
        return ResolveProperty(raw, csproj);
    }

    private static string? ResolveProperty(string value, XDocument doc)
    {
        if (!value.StartsWith("$(", StringComparison.Ordinal) || !value.EndsWith(')'))
            return value;
        var name = value[2..^1];
        var prop = doc.Descendants()
            .Where(e => e.Name.LocalName == "PropertyGroup")
            .SelectMany(g => g.Elements())
            .FirstOrDefault(e => string.Equals(e.Name.LocalName, name, StringComparison.OrdinalIgnoreCase));
        return prop is { Value: { Length: > 0 } v } && !v.StartsWith("$(", StringComparison.Ordinal) ? v : null;
    }

    private static string? CentralPackageVersion(string include, IAppDirectory dir)
    {
        foreach (var file in new[] { "Directory.Packages.props", "App/Directory.Packages.props" })
        {
            if (dir.ReadAllBytes(file) is not { } data || LoadXml(data) is not { } doc)
                continue;
            var entry = doc.Descendants()
                .FirstOrDefault(e =>
                    e.Name.LocalName == "PackageVersion"
                    && string.Equals(e.Attribute("Include")?.Value, include, StringComparison.OrdinalIgnoreCase)
                );
            if (entry?.Attribute("Version")?.Value is { Length: > 0 } v)
                return ResolveProperty(v, doc);
        }
        return null;
    }

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

    private static bool TryMajor(string version, out int major)
    {
        var cut = version.AsSpan().IndexOfAny(_majorTerminators);
        return int.TryParse(cut < 0 ? version : version[..cut], out major);
    }

    private static SourceSpan PositionOf(XElement el, byte[] data, string file, SourceSpan fallback)
    {
        var (line, col) = XmlPositions.LineCol(el as IXmlLineInfo, data, Spans.LineStarts(data));
        return line > 0 ? new SourceSpan(file, "", line, col) : fallback;
    }
}
