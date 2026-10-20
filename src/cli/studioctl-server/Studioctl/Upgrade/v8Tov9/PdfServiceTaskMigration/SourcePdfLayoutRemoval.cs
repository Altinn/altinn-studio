using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>
/// Removes a data task's own PDF layout once the task's PDF service task renders the PDF from a folder of
/// its own: the layout file and <c>pages.pdfLayoutName</c> in the task's settings. Left in place, Altinn
/// Studio would keep showing them as the task's PDF, where editing them changes nothing. A layout that is
/// also one of the task's pages, or that something else refers to, is kept.
/// </summary>
internal static class SourcePdfLayoutRemoval
{
    private const string PropertyName = "pdfLayoutName";

    private static readonly JsonDocumentOptions _lenientOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>Folders under the app folder that hold no app code of the developer's.</summary>
    private static readonly HashSet<string> _skippedFolders = new(StringComparer.Ordinal)
    {
        "bin",
        "obj",
        "node_modules",
        ".git",
    };

    /// <summary>Removes the task's PDF layout if it is safe to, and says what was done.</summary>
    /// <returns>A sentence for the upgrade report.</returns>
    public static async Task<string> Remove(SourceTaskPdfLayout.Custom source, Func<string, string> displayPath)
    {
        var name = source.PdfLayoutName;
        var settingsFile = Path.Combine(source.UiFolder, "Settings.json");
        var layoutFile = Path.Combine(source.UiFolder, "layouts", $"{name}.json");
        var what = $"{PropertyName} and layouts/{name}.json";
        string Kept(string reason) =>
            $"Kept {what} in {displayPath(source.UiFolder)}, which the PDF no longer uses, since {reason}.";

        var (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(settingsFile));
        if (JsonNode.Parse(text, documentOptions: _lenientOptions) is not JsonObject settings)
            return Kept($"{displayPath(settingsFile)} is not a JSON object");

        if (IsInPageOrder(settings, name))
            return Kept($"'{name}' is one of the task's pages too");

        if (FindReference(source) is { } referrer)
            return Kept($"{displayPath(referrer)} refers to '{name}'");

        if (WithoutPdfLayoutName(text, settings) is not { } updated)
            return Kept(
                $"{PropertyName} cannot be removed from {displayPath(settingsFile)} without changing the rest of it"
            );

        // Settings first: should the run stop in between, a layout file nothing names is harmless, while a
        // pdfLayoutName naming a missing layout is not.
        await Utf8TextFile.Write(settingsFile, updated, hadBom);
        File.Delete(layoutFile);
        return $"Removed {what} from {displayPath(source.UiFolder)}, which the PDF no longer uses.";
    }

    private static bool IsInPageOrder(JsonObject settings, string page)
    {
        if (settings["pages"] is not JsonObject pages)
            return false;

        var orders = new List<JsonNode?> { pages["order"] };
        if (pages["groups"] is JsonArray groups)
            orders.AddRange(groups.Select(group => (group as JsonObject)?["order"]));

        return orders
            .OfType<JsonArray>()
            .SelectMany(order => order)
            .Any(entry => entry is JsonValue value && value.TryGetValue<string>(out var text) && text == page);
    }

    /// <summary>
    /// A file, other than the layout and its task's settings, that names the layout as a string: a layout
    /// in the app's UI folders, outside the PDF service task's own folder, or the app's code. Settings files
    /// name only their own folder's pages.
    /// </summary>
    private static string? FindReference(SourceTaskPdfLayout.Custom source)
    {
        var literal = $"\"{source.PdfLayoutName}\"";
        var layoutFile = Path.Combine(source.UiFolder, "layouts", $"{source.PdfLayoutName}.json");
        var pdfTaskUiFolder = source.PdfTaskUiFolder + Path.DirectorySeparatorChar;
        var uiFolder = Path.GetDirectoryName(source.UiFolder) ?? source.UiFolder;
        var appFolder = Path.GetDirectoryName(uiFolder) ?? uiFolder;

        var uiFiles = Directory
            .EnumerateFiles(uiFolder, "*.json", SearchOption.AllDirectories)
            .Where(file =>
                file != layoutFile
                && Path.GetFileName(file) != "Settings.json"
                && !file.StartsWith(pdfTaskUiFolder, StringComparison.Ordinal)
            );

        return uiFiles
            .Concat(CodeFiles(appFolder))
            .FirstOrDefault(file => File.ReadAllText(file).Contains(literal, StringComparison.Ordinal));
    }

    private static IEnumerable<string> CodeFiles(string folder)
    {
        foreach (var file in Directory.EnumerateFiles(folder, "*.cs"))
            yield return file;

        foreach (var subfolder in Directory.EnumerateDirectories(folder))
        {
            if (_skippedFolders.Contains(Path.GetFileName(subfolder)))
                continue;
            foreach (var file in CodeFiles(subfolder))
                yield return file;
        }
    }

    /// <summary>
    /// The settings text without the line holding <c>pdfLayoutName</c>, and without the comma that leaves
    /// dangling when it was the last property of <c>pages</c>. Null unless the result is exactly the same
    /// JSON minus that property, parsing as strictly as the original does.
    /// </summary>
    private static string? WithoutPdfLayoutName(string text, JsonObject settings)
    {
        var lines = text.Split('\n');
        if (lines.Count(IsPdfLayoutNameLine) != 1)
            return null;

        var kept = new List<string>(lines.Length);
        for (var index = 0; index < lines.Length; index++)
        {
            if (!IsPdfLayoutNameLine(lines[index]))
            {
                kept.Add(lines[index]);
                continue;
            }

            var next = lines.Skip(index + 1).Select(line => line.TrimStart()).FirstOrDefault(line => line.Length > 0);
            if (next is not null && next.StartsWith('}') && kept.Count > 0)
            {
                // Drop only the comma, keeping any trailing whitespace such as the '\r' of CRLF files.
                var previous = kept[^1];
                var content = previous.TrimEnd();
                if (content.EndsWith(','))
                    kept[^1] = content[..^1] + previous[content.Length..];
            }
        }

        var result = string.Join('\n', kept);
        var expected = settings.DeepClone();
        (expected["pages"] as JsonObject)?.Remove(PropertyName);
        try
        {
            var strict = IsStrictJson(text);
            var actual = strict ? JsonNode.Parse(result) : JsonNode.Parse(result, documentOptions: _lenientOptions);
            return JsonNode.DeepEquals(actual, expected) ? result : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Whether the line holds <c>"pdfLayoutName": "&lt;name&gt;"</c>, an optional comma, and nothing else.</summary>
    private static bool IsPdfLayoutNameLine(string line)
    {
        var trimmed = line.Trim();
        var quotedName = $"\"{PropertyName}\"";
        if (!trimmed.StartsWith(quotedName, StringComparison.Ordinal))
            return false;

        var rest = trimmed[quotedName.Length..].TrimStart();
        if (!rest.StartsWith(':'))
            return false;

        var value = rest[1..].Trim();
        if (value.EndsWith(','))
            value = value[..^1].TrimEnd();

        try
        {
            return JsonNode.Parse(value) is JsonValue parsed && parsed.TryGetValue<string>(out _);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool IsStrictJson(string text)
    {
        try
        {
            JsonNode.Parse(text);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
