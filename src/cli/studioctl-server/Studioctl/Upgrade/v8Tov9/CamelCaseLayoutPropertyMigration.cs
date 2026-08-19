using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade.JsonWhitespaceRestoration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Migrates layout-property contracts that changed from snake_case to camelCase in frontend v9.
/// Only properties on their owning components are renamed. JSON is serialized after mutation and
/// whitespace-only changes are restored afterwards, matching the other layout migrators.
/// </summary>
internal static class CamelCaseLayoutPropertyMigration
{
    private static readonly IReadOnlyDictionary<string, string> _organizationLookupBindings = new Dictionary<
        string,
        string
    >
    {
        ["organization_lookup_orgnr"] = "orgnr",
        ["organization_lookup_name"] = "name",
    };

    private static readonly IReadOnlyDictionary<string, string> _personLookupBindings = new Dictionary<string, string>
    {
        ["person_lookup_ssn"] = "ssn",
        ["person_lookup_name"] = "fullName",
        ["person_lookup_first_name"] = "firstName",
        ["person_lookup_middle_name"] = "middleName",
        ["person_lookup_last_name"] = "lastName",
    };

    private static readonly IReadOnlyDictionary<string, string> _repeatingGroupTextResourceBindings = new Dictionary<
        string,
        string
    >
    {
        ["add_button_full"] = "addButtonFull",
        ["add_button"] = "addButton",
        ["save_button"] = "saveButton",
        ["save_and_next_button"] = "saveAndNextButton",
        ["edit_button_close"] = "editButtonClose",
        ["edit_button_open"] = "editButtonOpen",
        ["pagination_next_button"] = "paginationNextButton",
        ["pagination_back_button"] = "paginationBackButton",
        ["multipage_back_button"] = "multipageBackButton",
        ["multipage_next_button"] = "multipageNextButton",
    };

    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            UpgradeConsole.Skip("No UI directory found");
            return 0;
        }

        var changedFiles = new List<string>();
        var propertiesRenamed = 0;
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

            var renamedInFile = RenameLegacyProperties(root);
            if (renamedInFile == 0)
                continue;

            var updated = root.ToJsonString(_jsonOptions);
            if (decoded.Text.EndsWith('\n'))
                updated += Environment.NewLine;
            await Utf8TextFile.Write(layoutFile, updated, decoded.HadBom);
            changedFiles.Add(layoutFile);
            propertiesRenamed += renamedInFile;
            UpgradeConsole.Ok($"Migrated {renamedInFile} camelCase layout property name(s) in {layoutFile}");
        }

        if (changedFiles.Count == 0)
            UpgradeConsole.Skip("No snake_case layout property contracts found");
        else
        {
            try
            {
                new WhitespaceRestorationProcessor(uiDirectory).RestoreWhitespaceOnlyChanges(changedFiles);
            }
            catch
            {
                // Formatting restoration is best-effort when upgrading outside a Git repository.
            }
            UpgradeConsole.Ok(
                $"Migrated {propertiesRenamed} camelCase layout property name(s) across {changedFiles.Count} layout file(s)"
            );
        }
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

    private static int RenameLegacyProperties(JsonNode node)
    {
        var renamed = 0;
        if (node is JsonObject obj)
        {
            if (obj["type"]?.GetValue<string>() is { } type)
            {
                var (container, properties) = type switch
                {
                    "OrganizationLookup" => (obj["dataModelBindings"], _organizationLookupBindings),
                    "PersonLookup" => (obj["dataModelBindings"], _personLookupBindings),
                    "RepeatingGroup" => (obj["textResourceBindings"], _repeatingGroupTextResourceBindings),
                    _ => (null, null),
                };
                if (container is JsonObject propertyObject && properties is not null)
                {
                    var entries = propertyObject.ToList();
                    var renamedEntries = entries.Count(entry => properties.ContainsKey(entry.Key));
                    if (renamedEntries > 0)
                    {
                        propertyObject.Clear();
                        foreach (var (name, value) in entries)
                            propertyObject[properties.GetValueOrDefault(name, name)] = value;
                        renamed += renamedEntries;
                    }
                }
            }

            foreach (var child in obj.Select(property => property.Value).OfType<JsonNode>())
                renamed += RenameLegacyProperties(child);
        }
        else if (node is JsonArray array)
            foreach (var child in array.OfType<JsonNode>())
                renamed += RenameLegacyProperties(child);
        return renamed;
    }
}
