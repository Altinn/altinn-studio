using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Finds and reads the app's text resource files, <c>config/texts/resource.*.json</c>.
/// </summary>
internal static class AppTextResources
{
    /// <summary>
    /// The app's texts directory, under <c>App/config/texts</c> or <c>config/texts</c>, or null when there is none.
    /// </summary>
    public static string? ResolveTextsDirectory(string projectFolder)
    {
        var appTexts = Path.Combine(projectFolder, "App", "config", "texts");
        if (Directory.Exists(appTexts))
            return appTexts;

        var texts = Path.Combine(projectFolder, "config", "texts");
        return Directory.Exists(texts) ? texts : null;
    }

    /// <summary>
    /// The ids of every text resource, in any language.
    /// </summary>
    public static async Task<IReadOnlySet<string>> ReadIds(string projectFolder)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        var textsDirectory = ResolveTextsDirectory(projectFolder);
        if (textsDirectory is null)
            return ids;

        foreach (var resourceFile in Directory.EnumerateFiles(textsDirectory, "resource.*.json"))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(resourceFile));
            var root = JsonNode.Parse(
                decoded.Text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root?["resources"] is not JsonArray resources)
                continue;

            foreach (var resource in resources)
            {
                if (
                    resource is JsonObject entry
                    && entry["id"] is JsonValue id
                    && id.TryGetValue<string>(out var value)
                )
                    ids.Add(value);
            }
        }

        return ids;
    }
}
