using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Warns about keys in the <c>AppSettings</c> section of the app's <c>appsettings*.json</c> files that v9 no
/// longer reads: <c>AppBasePath</c> and the folder and file name settings. The app files are read from the content
/// root in the layout Studio creates, so the keys are inert; they are reported rather than deleted, since a value
/// other than the default is worth a look - it may mean the app's folders are laid out in a way v9 does not read.
/// </summary>
internal sealed class AppSettingsRemovedKeysDetector
{
    private const string SectionName = "AppSettings";

    private static readonly IReadOnlyDictionary<string, string> _defaults = new Dictionary<string, string>(
        StringComparer.OrdinalIgnoreCase
    )
    {
        ["AppBasePath"] = "",
        ["ConfigurationFolder"] = "config/",
        ["OptionsFolder"] = "options/",
        ["UiFolder"] = "ui/",
        ["ModelsFolder"] = "models/",
        ["TextFolder"] = "texts/",
        ["ProcessFolder"] = "process/",
        ["AuthorizationFolder"] = "authorization/",
        ["FormLayoutSettingsFileName"] = "Settings.json",
        ["FooterFileName"] = "footer.json",
        ["JsonSchemaFileName"] = "schema.json",
        ["ValidationConfigurationFileName"] = "validation.json",
        ["CalculationConfigurationFileName"] = "calculation.json",
        ["ApplicationMetadataFileName"] = "applicationmetadata.json",
        ["ApplicationXACMLPolicyFileName"] = "policy.xml",
        ["ProcessFileName"] = "process.bpmn",
    };

    private const string Summary =
        "These AppSettings keys are no longer read in v9 and can be deleted: the app files are read from the "
        + "content root of the host in the folder layout Studio creates. A key with a value other than the default "
        + "is marked, since the app's files may then be somewhere v9 does not look. Keys found:";

    private readonly string _appFolder;

    /// <param name="appFolder">The folder with the app's project file and appsettings files</param>
    public AppSettingsRemovedKeysDetector(string appFolder)
    {
        _appFolder = appFolder;
    }

    public MigrationResult Detect()
    {
        var found = new List<string>();
        foreach (var file in EnumerateAppSettingsFiles())
        {
            using var document = TryParse(file);
            if (document is null || document.RootElement.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            if (
                !TryGetProperty(document.RootElement, SectionName, out var section)
                || section.ValueKind != JsonValueKind.Object
            )
            {
                continue;
            }

            var relativeFile = Path.GetRelativePath(_appFolder, file);
            foreach (var property in section.EnumerateObject())
            {
                if (!_defaults.TryGetValue(property.Name, out var defaultValue))
                {
                    continue;
                }

                var value = property.Value.ValueKind == JsonValueKind.String ? property.Value.GetString() : null;
                var isDefault = string.Equals(
                    (value ?? "").Trim('/', '\\'),
                    defaultValue.Trim('/', '\\'),
                    StringComparison.OrdinalIgnoreCase
                );
                found.Add(
                    isDefault
                        ? $"{relativeFile}: {SectionName}:{property.Name}"
                        : $"{relativeFile}: {SectionName}:{property.Name} = {property.Value.GetRawText()} "
                            + $"(not the default '{defaultValue}' - check where the app's files are)"
                );
            }
        }

        if (found.Count == 0)
        {
            return new MigrationResult();
        }

        var messages = new List<UpgradeMessage>();
        messages.Warn(Summary);
        messages.WarnRange(found);
        return new MigrationResult(messages);
    }

    private IEnumerable<string> EnumerateAppSettingsFiles()
    {
        if (!Directory.Exists(_appFolder))
        {
            return [];
        }

        return Directory
            .EnumerateFiles(_appFolder, "appsettings*.json", SearchOption.TopDirectoryOnly)
            .Order(StringComparer.Ordinal);
    }

    private static JsonDocument? TryParse(string file)
    {
        try
        {
            return JsonDocument.Parse(
                File.ReadAllBytes(file),
                new JsonDocumentOptions { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip }
            );
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Configuration keys are case-insensitive, so the section is looked up that way too.</summary>
    private static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
    {
        foreach (var property in element.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }

        value = default;
        return false;
    }
}
