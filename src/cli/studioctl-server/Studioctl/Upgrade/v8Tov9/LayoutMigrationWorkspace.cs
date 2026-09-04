using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal sealed record LayoutMutationResult(int FilesChanged, int Changes);

/// <summary>
/// Owns the layout-file lifecycle for the v8-to-v9 upgrade. Layout migrations operate on the
/// already-parsed documents; this type alone discovers, decodes, serializes and writes them.
/// </summary>
internal sealed class LayoutMigrationWorkspace
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly List<LayoutDocument> _documents;
    private readonly List<string> _manualConversionFiles;
    private readonly List<LayoutFileIssue> _unreadableFiles;

    private LayoutMigrationWorkspace(
        string uiDirectory,
        List<LayoutDocument> documents,
        List<string> manualConversionFiles,
        List<LayoutFileIssue> unreadableFiles
    )
    {
        UiDirectory = uiDirectory;
        _documents = documents;
        _manualConversionFiles = manualConversionFiles;
        _unreadableFiles = unreadableFiles;
    }

    public string UiDirectory { get; }
    public IReadOnlyList<LayoutDocument> Documents => _documents;
    public IReadOnlyList<string> ManualConversionFiles => _manualConversionFiles;
    public IReadOnlyList<LayoutFileIssue> UnreadableFiles => _unreadableFiles;

    public static async Task<LayoutMigrationWorkspace?> Load(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
            return null;

        var documents = new List<LayoutDocument>();
        var manualConversionFiles = new List<string>();
        var unreadableFiles = new List<LayoutFileIssue>();
        foreach (var path in FindLayoutFiles(uiDirectory))
        {
            var (text, hadBom) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(path));
            JsonNode? root;
            try
            {
                root = JsonNode.Parse(
                    text,
                    new JsonNodeOptions { PropertyNameCaseInsensitive = false },
                    new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
                );
            }
            catch (JsonException exception)
            {
                if (text.Contains("MANUAL CONVERSION REQUIRED", StringComparison.Ordinal))
                    manualConversionFiles.Add(path);
                else
                    unreadableFiles.Add(new LayoutFileIssue(path, exception.Message));
                continue;
            }

            if (root is null)
                throw new JsonException($"Layout file does not contain JSON: {path}");

            documents.Add(new LayoutDocument(path, text, hadBom, root));
        }

        return new LayoutMigrationWorkspace(uiDirectory, documents, manualConversionFiles, unreadableFiles);
    }

    public LayoutMutationResult Apply(Func<JsonNode, int> mutation) =>
        ApplyDocuments(document => mutation(document.Root));

    public LayoutMutationResult ApplyDocuments(Func<LayoutDocument, int> mutation)
    {
        var filesChanged = 0;
        var changes = 0;
        foreach (var document in _documents)
        {
            var changesInFile = mutation(document);
            if (changesInFile == 0)
                continue;

            document.MarkModified();
            filesChanged++;
            changes += changesInFile;
        }

        return new LayoutMutationResult(filesChanged, changes);
    }

    public IEnumerable<LayoutDocument> DocumentsIn(string layoutsDirectory)
    {
        var expected = Path.GetFullPath(layoutsDirectory).TrimEnd(Path.DirectorySeparatorChar);
        return _documents.Where(document =>
            string.Equals(
                Path.GetDirectoryName(Path.GetFullPath(document.FilePath))?.TrimEnd(Path.DirectorySeparatorChar),
                expected,
                StringComparison.Ordinal
            )
        );
    }

    public bool HasManualConversionFileIn(string layoutsDirectory)
    {
        var expected = Path.GetFullPath(layoutsDirectory).TrimEnd(Path.DirectorySeparatorChar);
        return _manualConversionFiles.Any(path =>
            string.Equals(
                Path.GetDirectoryName(Path.GetFullPath(path))?.TrimEnd(Path.DirectorySeparatorChar),
                expected,
                StringComparison.Ordinal
            )
        );
    }

    public bool HasUnreadableFileIn(string layoutsDirectory) =>
        IsPathInDirectory(_unreadableFiles.Select(issue => issue.FilePath), layoutsDirectory);

    public async Task Save()
    {
        var changedFiles = new List<string>();
        foreach (var document in _documents.Where(static document => document.IsModified))
        {
            var text = document.Root.ToJsonString(_jsonOptions);
            text = document.AddManualConversionComments(text);
            text = document.NormalizeLineEndings(text);
            if (document.HadTrailingNewline)
                text += document.LineEnding;

            await Utf8TextFile.Write(document.FilePath, text, document.HadBom);
            changedFiles.Add(document.FilePath);
        }

        if (changedFiles.Count == 0)
            return;

        try
        {
            new WhitespaceRestorationProcessor(UiDirectory).RestoreWhitespaceOnlyChanges(changedFiles);
        }
        catch
        {
            // Formatting restoration is best-effort when the app is not in a Git repository.
        }

        // Whitespace restoration uses the repository version as its source. Reassert the traits of
        // the file supplied to this run so dirty-worktree upgrades do not change BOM or line endings.
        foreach (var document in _documents.Where(static document => document.IsModified))
        {
            var (text, _) = Utf8TextFile.Decode(await File.ReadAllBytesAsync(document.FilePath));
            text = document.NormalizeLineEndings(text).TrimEnd('\r', '\n');
            if (document.HadTrailingNewline)
                text += document.LineEnding;
            await Utf8TextFile.Write(document.FilePath, text, document.HadBom);
        }
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
            )
            .Order(StringComparer.Ordinal);

    private static bool IsPathInDirectory(IEnumerable<string> paths, string directory)
    {
        var expected = Path.GetFullPath(directory).TrimEnd(Path.DirectorySeparatorChar);
        return paths.Any(path =>
            string.Equals(
                Path.GetDirectoryName(Path.GetFullPath(path))?.TrimEnd(Path.DirectorySeparatorChar),
                expected,
                StringComparison.Ordinal
            )
        );
    }

    internal sealed class LayoutDocument
    {
        public LayoutDocument(string filePath, string originalText, bool hadBom, JsonNode root)
        {
            FilePath = filePath;
            OriginalText = originalText;
            HadBom = hadBom;
            Root = root;
            HadTrailingNewline = originalText.EndsWith('\n');
            LineEnding = originalText.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
            HasComments = ContainsComments(originalText);
        }

        public string FilePath { get; }
        public string OriginalText { get; }
        public bool HadBom { get; }
        public bool HadTrailingNewline { get; }
        public string LineEnding { get; }
        public bool HasComments { get; }
        public JsonNode Root { get; private set; }
        public bool IsModified { get; private set; }

        public void MarkModified() => IsModified = true;

        public void ReplaceRoot(JsonNode root)
        {
            Root = root;
            IsModified = true;
        }

        public string NormalizeLineEndings(string text) =>
            LineEnding == "\n"
                ? text.Replace("\r\n", "\n", StringComparison.Ordinal)
                : text.Replace("\r\n", "\n", StringComparison.Ordinal).Replace("\n", "\r\n", StringComparison.Ordinal);

        public string AddManualConversionComments(string jsonText)
        {
            if (!jsonText.Contains("__MANUAL_CONVERSION_REQUIRED_", StringComparison.Ordinal))
                return jsonText;

            var lines = jsonText.Split('\n');
            var output = new List<string>(lines.Length);
            foreach (var line in lines)
            {
                var trimmed = line.TrimStart();
                var isArrayValue = trimmed.StartsWith("\"__MANUAL_CONVERSION_REQUIRED_", StringComparison.Ordinal);
                var isHiddenProperty = trimmed.StartsWith(
                    "\"hidden\": \"__MANUAL_CONVERSION_REQUIRED_",
                    StringComparison.Ordinal
                );
                if (!isArrayValue && !isHiddenProperty)
                {
                    output.Add(line);
                    continue;
                }

                var markerStart =
                    line.IndexOf("__MANUAL_CONVERSION_REQUIRED_", StringComparison.Ordinal)
                    + "__MANUAL_CONVERSION_REQUIRED_".Length;
                var markerEnd = line.IndexOf("__\"", markerStart, StringComparison.Ordinal);
                var ruleId = markerEnd > markerStart ? line[markerStart..markerEnd] : "unknown";
                var indent = line[..(line.Length - line.TrimStart().Length)];
                output.Add($"{indent}/* TODO: MANUAL CONVERSION REQUIRED for legacy rule '{ruleId}'.");
                output.Add($"{indent}   Use _conversionFailureInfo above to finish the conversion, then remove it.");
                output.Add($"{indent}   Replace MANUAL_CONVERSION_REQUIRED with a valid hidden expression.");
                output.Add($"{indent}   Remove this rule from RuleConfiguration.json before rerunning the upgrade.");
                output.Add($"{indent}*/");
                var trailingComma = line.TrimEnd().EndsWith(',') ? "," : "";
                output.Add(
                    isArrayValue
                        ? $"{indent}MANUAL_CONVERSION_REQUIRED{trailingComma}"
                        : $"{indent}\"hidden\": MANUAL_CONVERSION_REQUIRED{trailingComma}"
                );
            }

            return string.Join("\n", output);
        }

        private static bool ContainsComments(string text)
        {
            var reader = new Utf8JsonReader(
                Encoding.UTF8.GetBytes(text),
                new JsonReaderOptions { CommentHandling = JsonCommentHandling.Allow, AllowTrailingCommas = true }
            );
            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.Comment)
                    return true;
            }

            return false;
        }
    }
}

internal sealed record LayoutFileIssue(string FilePath, string Reason);
