using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

internal static class OrganizationLookupLayoutMigration
{
    private const string OldComponentType = "OrganisationLookup";
    private const string NewComponentType = "OrganizationLookup";
    private const string OldOrganizationNumberBinding = "organization_lookup_orgnr";
    private const string OldOrganizationNameBinding = "organization_lookup_name";

    private static readonly Regex _componentTypePattern = new(
        "(\"type\"\\s*:\\s*)\"OrganisationLookup\"",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );
    private static readonly Regex _organizationNumberBindingPattern = new(
        "\"organization_lookup_orgnr\"(?=\\s*:)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );
    private static readonly Regex _organizationNameBindingPattern = new(
        "\"organization_lookup_name\"(?=\\s*:)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant
    );

    public static async Task<int> Migrate(string projectFolder)
    {
        var uiDirectory = ResolveUiDirectory(projectFolder);
        if (uiDirectory is null)
        {
            UpgradeConsole.Skip("No UI directory found");
            return 0;
        }

        var changedFiles = 0;
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
            if (
                occurrences.Components == 0
                && occurrences.OrganizationNumberBindings == 0
                && occurrences.OrganizationNameBindings == 0
            )
                continue;

            EnsureExpectedOccurrences(layoutFile, decoded.Text, occurrences);
            var migrated = _componentTypePattern.Replace(
                decoded.Text,
                match => match.Groups[1].Value + $"\"{NewComponentType}\""
            );
            migrated = _organizationNumberBindingPattern.Replace(migrated, "\"organization_lookup_orgnr\"");
            migrated = _organizationNameBindingPattern.Replace(migrated, "\"organization_lookup_name\"");

            await Utf8TextFile.Write(layoutFile, migrated, decoded.HadBom);
            changedFiles++;
            var bindings = occurrences.OrganizationNumberBindings + occurrences.OrganizationNameBindings;
            UpgradeConsole.Ok(
                $"Migrated {occurrences.Components} component type(s) and {bindings} binding(s) in {layoutFile}"
            );
        }

        if (changedFiles == 0)
        {
            UpgradeConsole.Skip("No OrganisationLookup contract tokens found");
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

    private static LegacyContractOccurrences CountLegacyContract(JsonNode node)
    {
        var occurrences = new LegacyContractOccurrences();
        if (node is JsonObject obj)
        {
            if (HasLookupComponentType(obj, out var isLegacyComponent))
            {
                occurrences.Components += isLegacyComponent ? 1 : 0;
                if (obj["dataModelBindings"] is JsonObject bindings)
                {
                    occurrences.OrganizationNumberBindings += bindings.ContainsKey(OldOrganizationNumberBinding)
                        ? 1
                        : 0;
                    occurrences.OrganizationNameBindings += bindings.ContainsKey(OldOrganizationNameBinding) ? 1 : 0;
                }
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

    private static bool HasLookupComponentType(JsonObject obj, out bool isLegacyComponent)
    {
        isLegacyComponent = false;
        if (obj["type"] is not JsonValue type || !type.TryGetValue<string>(out var componentType))
            return false;

        isLegacyComponent = componentType == OldComponentType;
        return isLegacyComponent || componentType == NewComponentType;
    }

    private static void EnsureExpectedOccurrences(string layoutFile, string content, LegacyContractOccurrences expected)
    {
        var componentTypes = _componentTypePattern.Count(content);
        var organizationNumberBindings = _organizationNumberBindingPattern.Count(content);
        var organizationNameBindings = _organizationNameBindingPattern.Count(content);
        if (
            componentTypes != expected.Components
            || organizationNumberBindings != expected.OrganizationNumberBindings
            || organizationNameBindings != expected.OrganizationNameBindings
        )
        {
            throw new InvalidOperationException(
                $"Could not safely migrate {layoutFile}: legacy OrganisationLookup tokens occur outside matching components "
                    + $"(type: {componentTypes} text vs {expected.Components} structural, "
                    + $"organization-number binding: {organizationNumberBindings} text vs {expected.OrganizationNumberBindings} structural, "
                    + $"name binding: {organizationNameBindings} text vs {expected.OrganizationNameBindings} structural)"
            );
        }
    }

    private sealed class LegacyContractOccurrences
    {
        public int Components { get; set; }
        public int OrganizationNumberBindings { get; set; }
        public int OrganizationNameBindings { get; set; }

        public void Add(LegacyContractOccurrences other)
        {
            Components += other.Components;
            OrganizationNumberBindings += other.OrganizationNumberBindings;
            OrganizationNameBindings += other.OrganizationNameBindings;
        }
    }
}
