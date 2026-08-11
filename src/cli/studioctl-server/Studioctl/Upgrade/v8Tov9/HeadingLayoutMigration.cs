using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Rewrites layout component type <c>Header</c> to <c>Heading</c> (and matching summary
/// <c>componentType</c> refs) under <c>App/ui/**/layouts</c>.
/// </summary>
internal static class HeadingLayoutMigration
{
    private const string OldComponentType = "Header";
    private const string NewComponentType = "Heading";

    private static readonly Regex _componentTypePattern = new(
        "(\"type\"\\s*:\\s*)\"Header\"",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );
    private static readonly Regex _summaryComponentTypePattern = new(
        "(\"componentType\"\\s*:\\s*)\"Header\"",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            await UpgradeConsole.Out.WriteLineAsync("No UI directory found, skipping Heading migration");
            return 0;
        }

        var changedFiles = 0;
        var changedComponents = 0;
        var changedSummaryRefs = 0;
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

            var occurrences = CountLegacyContract(root);
            if (occurrences.Components == 0 && occurrences.SummaryComponentTypes == 0)
                continue;

            EnsureExpectedOccurrences(layoutFile, decoded.Text, occurrences);
            var migrated = _componentTypePattern.Replace(
                decoded.Text,
                match => match.Groups[1].Value + $"\"{NewComponentType}\""
            );
            migrated = _summaryComponentTypePattern.Replace(
                migrated,
                match => match.Groups[1].Value + $"\"{NewComponentType}\""
            );

            await Utf8TextFile.Write(layoutFile, migrated, decoded.HadBom);
            changedFiles++;
            changedComponents += occurrences.Components;
            changedSummaryRefs += occurrences.SummaryComponentTypes;
            await UpgradeConsole.Out.WriteLineAsync(
                $"Migrated {occurrences.Components} Heading component type(s) and {occurrences.SummaryComponentTypes} summary componentType ref(s) in {layoutFile}"
            );
        }

        await UpgradeConsole.Out.WriteLineAsync(
            changedFiles == 0
                ? "No Header layout contract tokens found to migrate"
                : $"Migrated {changedComponents} Heading component type(s) and {changedSummaryRefs} summary componentType ref(s) across {changedFiles} layout file(s)"
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

    private static LegacyContractOccurrences CountLegacyContract(JsonNode node)
    {
        var occurrences = new LegacyContractOccurrences();
        if (node is JsonObject obj)
        {
            if (
                obj["type"] is JsonValue type
                && type.TryGetValue<string>(out var componentType)
                && componentType == OldComponentType
            )
            {
                occurrences.Components++;
            }

            if (
                obj["componentType"] is JsonValue summaryType
                && summaryType.TryGetValue<string>(out var summaryComponentType)
                && summaryComponentType == OldComponentType
            )
            {
                occurrences.SummaryComponentTypes++;
            }

            foreach (var child in obj.Select(property => property.Value).ToList())
            {
                if (child is not null)
                    occurrences.Add(CountLegacyContract(child));
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array.ToList())
            {
                if (child is not null)
                    occurrences.Add(CountLegacyContract(child));
            }
        }

        return occurrences;
    }

    private static void EnsureExpectedOccurrences(string layoutFile, string content, LegacyContractOccurrences expected)
    {
        var componentTypes = _componentTypePattern.Count(content);
        var summaryComponentTypes = _summaryComponentTypePattern.Count(content);
        if (componentTypes != expected.Components || summaryComponentTypes != expected.SummaryComponentTypes)
        {
            throw new InvalidOperationException(
                $"Could not safely migrate {layoutFile}: legacy Header tokens occur outside matching layout properties "
                    + $"(type: {componentTypes} text vs {expected.Components} structural, "
                    + $"componentType: {summaryComponentTypes} text vs {expected.SummaryComponentTypes} structural)"
            );
        }
    }

    private sealed class LegacyContractOccurrences
    {
        public int Components { get; set; }
        public int SummaryComponentTypes { get; set; }

        public void Add(LegacyContractOccurrences other)
        {
            Components += other.Components;
            SummaryComponentTypes += other.SummaryComponentTypes;
        }
    }
}
