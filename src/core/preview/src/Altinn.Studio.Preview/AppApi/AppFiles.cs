using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using Altinn.Studio.Preview.Files;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The app's own files, which a real app reads from its image and preview reads from the working copy. A file that is
/// missing or isn't valid reads as <c>null</c>, since the developer may be in the middle of changing it.
/// </summary>
internal sealed partial class AppFiles(AppFolder folder)
{
    private static readonly JsonDocumentOptions s_jsonOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    /// <summary>
    /// The XML files come from the repository, so the reader resolves nothing outside them and refuses DTDs, which
    /// could expand without limit.
    /// </summary>
    private static readonly XmlReaderSettings s_xmlSettings = new()
    {
        DtdProcessing = DtdProcessing.Prohibit,
        XmlResolver = null,
    };

    public JsonObject? ApplicationMetadata() => ReadJson("App/config/applicationmetadata.json") as JsonObject;

    /// <summary>The languages the app has texts in, from the names of its text files.</summary>
    public IReadOnlyList<string> Languages() =>
        [
            .. folder
                .ListFiles("App/config/texts")
                .Select(name => TextFileName().Match(name))
                .Where(match => match.Success)
                .Select(match => match.Groups["language"].Value),
        ];

    public JsonNode? TextResources(string language) =>
        TextFileName().IsMatch($"resource.{language}.json")
            ? ReadJson($"App/config/texts/resource.{language}.json")
            : null;

    /// <summary>The app's UI folders, one for each task and stateless page set, with their settings.</summary>
    public IReadOnlyDictionary<string, JsonNode?> UiFolders() =>
        folder.ListDirectories("App/ui").ToDictionary(name => name, name => ReadJson($"App/ui/{name}/Settings.json"));

    public JsonNode? GlobalUiSettings() => ReadJson("App/ui/Settings.json");

    public JsonNode? Footer() => ReadJson("App/ui/footer.json");

    /// <summary>The layouts of a UI folder, by page name, or <c>null</c> when there is no such folder.</summary>
    public IReadOnlyDictionary<string, JsonNode?>? Layouts(string uiFolder)
    {
        if (!folder.ListDirectories("App/ui").Contains(uiFolder, StringComparer.Ordinal))
        {
            return null;
        }

        string layouts = $"App/ui/{uiFolder}/layouts";
        return folder
            .ListFiles(layouts)
            .Where(name => name.EndsWith(".json", StringComparison.Ordinal))
            .ToDictionary(name => name[..^".json".Length], name => ReadJson($"{layouts}/{name}"));
    }

    /// <summary>The JSON schema of a data type's model, which Studio names after the data type.</summary>
    public JsonNode? Schema(string dataType) => ReadJson($"App/models/{dataType}.schema.json");

    /// <summary>The app's static code lists, by their ID.</summary>
    public IReadOnlyDictionary<string, JsonNode?> Options() =>
        folder
            .ListFiles("App/options")
            .Where(name => name.EndsWith(".json", StringComparison.Ordinal))
            .ToDictionary(name => name[..^".json".Length], name => ReadJson($"App/options/{name}"));

    /// <summary>
    /// The version of the app library the app references, which decides the app frontend it gets, or <c>null</c> when
    /// the project doesn't reference it.
    /// </summary>
    public string? AppLibVersion()
    {
        foreach (
            string project in folder.ListFiles("App").Where(name => name.EndsWith(".csproj", StringComparison.Ordinal))
        )
        {
            XElement? reference = ReadXml($"App/{project}")
                ?.Descendants()
                .FirstOrDefault(element =>
                    element.Name.LocalName == "PackageReference"
                    && (string?)element.Attribute("Include") is "Altinn.App.Api" or "Altinn.App.Api.Experimental"
                );
            string? version =
                (string?)reference?.Attribute("Version")
                ?? reference?.Elements().FirstOrDefault(element => element.Name.LocalName == "Version")?.Value;
            if (version is not null && PackageVersion().IsMatch(version))
            {
                return version;
            }
        }

        return null;
    }

    public ProcessDefinition? Process() =>
        ReadXml("App/config/process/process.bpmn") is { } bpmn ? ProcessDefinition.From(bpmn) : null;

    private JsonNode? ReadJson(string path)
    {
        using Stream? file = folder.OpenRead(path);
        if (file is null)
        {
            return null;
        }

        try
        {
            return JsonNode.Parse(file, documentOptions: s_jsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private XDocument? ReadXml(string path)
    {
        using Stream? file = folder.OpenRead(path);
        if (file is null)
        {
            return null;
        }

        try
        {
            using var reader = XmlReader.Create(file, s_xmlSettings);
            return XDocument.Load(reader);
        }
        catch (XmlException)
        {
            return null;
        }
    }

    [GeneratedRegex("^resource\\.(?<language>[a-z]{2})\\.json$", RegexOptions.CultureInvariant)]
    private static partial Regex TextFileName();

    /// <summary>A NuGet version, which goes into the app frontend's URL.</summary>
    [GeneratedRegex("^[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?$", RegexOptions.CultureInvariant)]
    private static partial Regex PackageVersion();
}
