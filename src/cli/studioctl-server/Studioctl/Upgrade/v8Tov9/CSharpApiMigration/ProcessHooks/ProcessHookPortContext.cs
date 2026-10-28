using System.Text;
using System.Text.Json;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// What the hook port needs to know about the app beyond its C# code, read from its configuration files.
/// </summary>
/// <param name="ProjectFolder">The folder of the app's project file, which holds <c>config/</c>.</param>
/// <param name="AppId">The app's <c>org/app</c> id, or the folder name when the metadata has none.</param>
/// <param name="BpmnTaskIds">The ids of the process's tasks; empty when the process cannot be read.</param>
/// <param name="PackageVersions">
/// The <c>Version</c> of each <c>PackageReference</c> in the project files of <paramref name="ProjectFolder"/>, by
/// package id.
/// </param>
internal sealed record ProcessHookPortContext(
    string ProjectFolder,
    string AppId,
    IReadOnlySet<string> BpmnTaskIds,
    IReadOnlyDictionary<string, string> PackageVersions
)
{
    private static readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";

    private static readonly JsonDocumentOptions _jsonOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>
    /// Reads the context of the app in <paramref name="projectFolder"/>. A file that is missing or cannot be read
    /// leaves its part empty: the port then treats every task as possible.
    /// </summary>
    public static ProcessHookPortContext Read(string projectFolder)
    {
        var appId = ReadAppId(Path.Combine(projectFolder, "config", "applicationmetadata.json"));
        return new ProcessHookPortContext(
            projectFolder,
            appId ?? Path.GetFileName(Path.TrimEndingDirectorySeparator(projectFolder)),
            ReadTaskIds(Path.Combine(projectFolder, "config", "process", "process.bpmn")),
            ReadPackageVersions(projectFolder)
        );
    }

    private static Dictionary<string, string> ReadPackageVersions(string projectFolder)
    {
        var versions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            foreach (
                var projectFile in Directory.EnumerateFiles(projectFolder, "*.csproj").Order(StringComparer.Ordinal)
            )
            {
                foreach (
                    var reference in XDocument
                        .Parse(Utf8TextFile.Decode(File.ReadAllBytes(projectFile)).Text)
                        .Descendants()
                        .Where(static element => element.Name.LocalName == "PackageReference")
                )
                {
                    if (
                        (string?)reference.Attribute("Include") is { } id
                        && (string?)reference.Attribute("Version") is { } version
                    )
                    {
                        versions.TryAdd(id, version);
                    }
                }
            }
        }
        catch (Exception ex)
            when (ex
                    is IOException
                        or UnauthorizedAccessException
                        or DecoderFallbackException
                        or System.Xml.XmlException
            )
        {
            return versions;
        }

        return versions;
    }

    private static HashSet<string> ReadTaskIds(string processFile)
    {
        try
        {
            var document = XDocument.Parse(Utf8TextFile.Decode(File.ReadAllBytes(processFile)).Text);
            return document
                .Descendants()
                .Where(static element => element.Name == _bpmnNs + "task" || element.Name == _bpmnNs + "serviceTask")
                .Select(static element => (string?)element.Attribute("id"))
                .OfType<string>()
                .ToHashSet(StringComparer.Ordinal);
        }
        catch (Exception ex)
            when (ex
                    is IOException
                        or UnauthorizedAccessException
                        or DecoderFallbackException
                        or System.Xml.XmlException
            )
        {
            return [];
        }
    }

    private static string? ReadAppId(string metadataFile)
    {
        try
        {
            using var document = JsonDocument.Parse(
                Utf8TextFile.Decode(File.ReadAllBytes(metadataFile)).Text,
                _jsonOptions
            );
            return document.RootElement.ValueKind == JsonValueKind.Object ? String(document.RootElement, "id") : null;
        }
        catch (Exception ex)
            when (ex is IOException or UnauthorizedAccessException or DecoderFallbackException or JsonException)
        {
            return null;
        }
    }

    private static string? String(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
