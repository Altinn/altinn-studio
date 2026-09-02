using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Migrates layout-property contracts that changed from snake_case to camelCase in frontend v9.
/// Only properties on their owning components are renamed. The parsed structure identifies the exact
/// property paths, while a token-aware rewrite changes only those property-name bytes. This preserves
/// all original whitespace, line endings and formatting.
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

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            UpgradeConsole.Skip("No UI directory found");
            return 0;
        }

        var changedFiles = 0;
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

            var renames = FindLegacyProperties(root);
            if (renames.Count == 0)
                continue;

            var updated = ApplyRenames(decoded.Text, renames);
            await Utf8TextFile.Write(layoutFile, updated, decoded.HadBom);
            changedFiles++;
            propertiesRenamed += renames.Count;
            UpgradeConsole.Ok($"Migrated {renames.Count} camelCase layout property name(s) in {layoutFile}");
        }

        if (changedFiles == 0)
            UpgradeConsole.Skip("No snake_case layout property contracts found");
        else
            UpgradeConsole.Ok(
                $"Migrated {propertiesRenamed} camelCase layout property name(s) across {changedFiles} layout file(s)"
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

    private static Dictionary<string, string> FindLegacyProperties(JsonNode node)
    {
        var renames = new Dictionary<string, string>(StringComparer.Ordinal);
        FindLegacyProperties(node, [], renames);
        return renames;
    }

    private static void FindLegacyProperties(JsonNode node, List<string> path, IDictionary<string, string> renames)
    {
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
                    var containerName = type == "RepeatingGroup" ? "textResourceBindings" : "dataModelBindings";
                    foreach (var (oldName, newName) in properties)
                    {
                        if (!propertyObject.ContainsKey(oldName))
                            continue;
                        if (propertyObject.ContainsKey(newName))
                            throw new InvalidOperationException(
                                $"Cannot rename {oldName} to {newName}: both properties exist on {type}"
                            );
                        renames.Add(ToJsonPointer([.. path, containerName, oldName]), newName);
                    }
                }
            }

            foreach (var (name, child) in obj)
                if (child is not null)
                    FindLegacyProperties(child, [.. path, name], renames);
        }
        else if (node is JsonArray array)
            for (var index = 0; index < array.Count; index++)
                if (array[index] is { } child)
                    FindLegacyProperties(child, [.. path, index.ToString(CultureInfo.InvariantCulture)], renames);
    }

    private static string ApplyRenames(string content, IReadOnlyDictionary<string, string> renames)
    {
        var utf8 = Encoding.UTF8.GetBytes(content);
        var reader = new Utf8JsonReader(
            utf8,
            new JsonReaderOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true }
        );
        if (!reader.Read())
            throw new JsonException("Layout file does not contain JSON");

        var replacements = new List<PropertyReplacement>();
        FindPropertyTokens(ref reader, [], renames, replacements);
        if (replacements.Count != renames.Count)
            throw new InvalidOperationException(
                $"Could not locate all parsed layout properties in the source JSON ({replacements.Count} of {renames.Count})"
            );

        using var output = new MemoryStream(utf8.Length);
        var sourceOffset = 0;
        foreach (var replacement in replacements.OrderBy(item => item.Offset))
        {
            output.Write(utf8, sourceOffset, replacement.Offset - sourceOffset);
            output.Write(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(replacement.NewName)));
            sourceOffset = replacement.Offset + replacement.Length;
        }
        output.Write(utf8, sourceOffset, utf8.Length - sourceOffset);
        return Encoding.UTF8.GetString(output.ToArray());
    }

    private static void FindPropertyTokens(
        ref Utf8JsonReader reader,
        List<string> path,
        IReadOnlyDictionary<string, string> renames,
        ICollection<PropertyReplacement> replacements
    )
    {
        if (reader.TokenType == JsonTokenType.StartObject)
        {
            while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
            {
                if (reader.TokenType != JsonTokenType.PropertyName)
                    throw new JsonException("Expected a property name");
                var propertyName = reader.GetString() ?? throw new JsonException("Property name is null");
                var propertyPath = new List<string>(path) { propertyName };
                if (renames.TryGetValue(ToJsonPointer(propertyPath), out var newName))
                    replacements.Add(
                        new PropertyReplacement(
                            checked((int)reader.TokenStartIndex),
                            checked(reader.ValueSpan.Length + 2),
                            newName
                        )
                    );
                if (!reader.Read())
                    throw new JsonException("Expected a property value");
                FindPropertyTokens(ref reader, propertyPath, renames, replacements);
            }
        }
        else if (reader.TokenType == JsonTokenType.StartArray)
        {
            var index = 0;
            while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
            {
                FindPropertyTokens(
                    ref reader,
                    [.. path, index.ToString(CultureInfo.InvariantCulture)],
                    renames,
                    replacements
                );
                index++;
            }
        }
    }

    private static string ToJsonPointer(IEnumerable<string> path) =>
        "/" + string.Join("/", path.Select(segment => segment.Replace("~", "~0").Replace("/", "~1")));

    private sealed record PropertyReplacement(int Offset, int Length, string NewName);
}
