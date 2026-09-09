using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>Rewrites the removed <c>FileUploadWithTag</c> layout component to <c>FileUpload</c>.</summary>
internal static class FileUploadWithTagLayoutMigration
{
    private const string OldComponentType = "FileUploadWithTag";
    private const string NewComponentType = "FileUpload";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            UpgradeConsole.Skip("No UI directory found, skipping FileUploadWithTag migration");
            return 0;
        }

        var changedFiles = new List<string>();
        var sourceLineEndings = new Dictionary<string, string>();
        var changedComponents = 0;
        foreach (var layoutFile in FindLayoutFiles(uiDirectory))
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(layoutFile));
            var root = JsonNode.Parse(
                decoded.Text,
                new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
            );
            if (root is null)
                throw new JsonException($"Layout file does not contain JSON: {layoutFile}");

            var occurrences = RenameLegacyComponents(root);
            if (occurrences == 0)
                continue;

            var updated = root.ToJsonString(_jsonOptions);
            if (decoded.Text.EndsWith('\n'))
                updated += DetectLineEnding(decoded.Text);

            await Utf8TextFile.Write(layoutFile, updated, decoded.HadBom);
            changedFiles.Add(layoutFile);
            sourceLineEndings[layoutFile] = DetectLineEnding(decoded.Text);
            changedComponents += occurrences;
            UpgradeConsole.Ok($"Migrated {occurrences} FileUploadWithTag component type(s) in {layoutFile}");
        }

        if (changedFiles.Count > 0)
        {
            try
            {
                new WhitespaceRestorationProcessor(uiDirectory).RestoreWhitespaceOnlyChanges(changedFiles);
            }
            catch
            {
                // Formatting restoration is best-effort when upgrading outside a Git repository.
            }

            foreach (var layoutFile in changedFiles)
            {
                var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(layoutFile));
                var normalized = NormalizeLineEndings(decoded.Text, sourceLineEndings[layoutFile]);
                await Utf8TextFile.Write(layoutFile, normalized, decoded.HadBom);
            }
        }

        if (changedFiles.Count == 0)
            UpgradeConsole.Skip("No FileUploadWithTag layout component types found to migrate");
        else
            UpgradeConsole.Ok(
                $"Migrated {changedComponents} FileUploadWithTag components to FileUpload across {changedFiles.Count} layout file(s)"
            );

        return 0;
    }

    private static string? ResolveUiDirectory(string projectFolder)
    {
        var appUiDirectory = Path.Combine(projectFolder, "App", "ui");
        if (Directory.Exists(appUiDirectory))
            return appUiDirectory;

        var uiDirectory = Path.Combine(projectFolder, "ui");
        return Directory.Exists(uiDirectory) ? uiDirectory : null;
    }

    private static IEnumerable<string> FindLayoutFiles(string uiDirectory) =>
        Directory
            .EnumerateFiles(uiDirectory, "*.json", SearchOption.AllDirectories)
            .Where(path =>
                string.Equals(Path.GetFileName(Path.GetDirectoryName(path)), "layouts", StringComparison.Ordinal)
            );

    private static int RenameLegacyComponents(JsonNode node)
    {
        var count = 0;
        if (node is JsonObject obj)
        {
            if (
                obj["type"] is JsonValue type
                && type.TryGetValue<string>(out var componentType)
                && componentType == OldComponentType
            )
            {
                obj["type"] = NewComponentType;
                count++;
            }

            foreach (var child in obj.Select(property => property.Value).ToList())
                if (child is not null)
                    count += RenameLegacyComponents(child);
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
                if (child is not null)
                    count += RenameLegacyComponents(child);
        }

        return count;
    }

    private static string DetectLineEnding(string content) =>
        content.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";

    private static string NormalizeLineEndings(string content, string lineEnding) =>
        lineEnding == "\n"
            ? content.Replace("\r\n", "\n", StringComparison.Ordinal)
            : content
                .Replace("\r\n", "\n", StringComparison.Ordinal)
                .Replace("\n", lineEnding, StringComparison.Ordinal);
}
