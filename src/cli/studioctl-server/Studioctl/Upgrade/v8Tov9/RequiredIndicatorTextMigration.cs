using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record RequiredIndicatorTextMigrationResult(
    int FilesChanged,
    int AsteriskOverridesRemoved,
    int DescriptionOverridesRemoved,
    IReadOnlyList<string> Warnings
);

/// <summary>
/// Cleans up app text-resource overrides that only made sense while required fields were marked with an
/// asterisk. In v9 the app frontend follows the Designsystemet pattern for required and optional fields:
/// the marker is a tag reading "Må fylles ut" (<c>form_filler.required_label</c>), and the page-level
/// "Required fields are marked with *" banner (<c>form_filler.required_description</c>) is gone.
/// <list type="bullet">
///   <item>An override of <c>form_filler.required_label</c> that just repeats the old <c>*</c> default is
///   removed, so the app gets the new default wording instead of an asterisk inside a tag.</item>
///   <item>Any other override of <c>form_filler.required_label</c> is kept, with a warning asking the
///   developer to review the wording.</item>
///   <item>Overrides of <c>form_filler.required_description</c> are removed, since nothing renders that
///   text any more.</item>
/// </list>
/// </summary>
internal static class RequiredIndicatorTextMigration
{
    private const string RequiredLabelKey = "form_filler.required_label";
    private const string RequiredDescriptionKey = "form_filler.required_description";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        // Keep "æøå" as they are instead of escaping every non-ASCII character in the file.
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static async Task<RequiredIndicatorTextMigrationResult> Migrate(string projectFolder)
    {
        var textsDirectory = ResolveTextsDirectory(projectFolder);
        if (textsDirectory is null)
            return new RequiredIndicatorTextMigrationResult(0, 0, 0, []);

        var warnings = new List<string>();
        var changedFiles = new List<string>();
        var asteriskOverridesRemoved = 0;
        var descriptionOverridesRemoved = 0;

        foreach (var resourceFile in Directory.EnumerateFiles(textsDirectory, "resource.*.json"))
        {
            var fileName = Path.GetFileName(resourceFile);
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(resourceFile));
            var root = JsonNode.Parse(
                decoded.Text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root?["resources"] is not JsonArray resources)
                continue;

            var asterisksInFile = 0;
            var descriptionsInFile = 0;
            foreach (var entry in resources.OfType<JsonObject>().ToList())
            {
                if (entry["id"] is not JsonValue idNode || !idNode.TryGetValue<string>(out var id))
                    continue;

                if (id == RequiredDescriptionKey)
                {
                    resources.Remove(entry);
                    descriptionsInFile++;
                    continue;
                }

                if (id != RequiredLabelKey)
                    continue;

                var value =
                    entry["value"] is JsonValue valueNode && valueNode.TryGetValue<string>(out var v) ? v : null;
                if (value is not null && value.Trim() == "*")
                {
                    resources.Remove(entry);
                    asterisksInFile++;
                    continue;
                }

                warnings.Add(
                    $"{fileName}: keeps the custom required field marker '{value}'. It is now shown as a tag after "
                        + "the label instead of in the label text, so review the wording. Designsystemet recommends "
                        + "'Må fylles ut' (nb), 'Må fyllast ut' (nn) and 'Required' (en), which are the new defaults."
                );
            }

            if (asterisksInFile == 0 && descriptionsInFile == 0)
                continue;

            // Comments never make it into the node tree, so rewriting the file from it would delete them.
            if (ContainsComments(decoded.Text))
            {
                warnings.Add(
                    $"{fileName}: left untouched because it has comments, which a rewrite would delete. Remove the "
                        + $"'{RequiredLabelKey}' override (if its value is '*') and any '{RequiredDescriptionKey}' "
                        + "override by hand."
                );
                continue;
            }

            var hadTrailingNewline = decoded.Text.EndsWith('\n');
            var updated = root.ToJsonString(_jsonOptions);
            if (hadTrailingNewline)
                updated += Environment.NewLine;

            await Utf8TextFile.Write(resourceFile, updated, decoded.HadBom);
            changedFiles.Add(resourceFile);
            asteriskOverridesRemoved += asterisksInFile;
            descriptionOverridesRemoved += descriptionsInFile;
        }

        if (changedFiles.Count > 0)
        {
            try
            {
                new WhitespaceRestorationProcessor(textsDirectory).RestoreWhitespaceOnlyChanges(changedFiles);
            }
            catch
            {
                // Formatting restoration is best-effort, for example when upgrading outside a Git repository.
            }
        }

        return new RequiredIndicatorTextMigrationResult(
            changedFiles.Count,
            asteriskOverridesRemoved,
            descriptionOverridesRemoved,
            warnings
        );
    }

    private static string? ResolveTextsDirectory(string projectFolder)
    {
        var appTexts = Path.Combine(projectFolder, "App", "config", "texts");
        if (Directory.Exists(appTexts))
            return appTexts;

        var texts = Path.Combine(projectFolder, "config", "texts");
        return Directory.Exists(texts) ? texts : null;
    }

    /// <summary>
    /// Whether <paramref name="text"/> holds a JSON comment. Uses the reader rather than a text search so
    /// that "//" inside a string value - a URL, say - is not mistaken for one.
    /// </summary>
    private static bool ContainsComments(string text)
    {
        var reader = new Utf8JsonReader(
            Encoding.UTF8.GetBytes(text),
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Allow, AllowTrailingCommas = true }
        );

        try
        {
            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.Comment)
                    return true;
            }
        }
        catch (JsonException)
        {
            return true;
        }

        return false;
    }
}
