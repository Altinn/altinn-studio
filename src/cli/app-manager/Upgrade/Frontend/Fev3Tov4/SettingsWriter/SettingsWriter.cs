using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.SettingsWriter;

/// <summary>
/// Creates basic Settings.json file for all layout sets that are missing one
/// Must be run after LayoutSetUpgrader
/// </summary>
internal sealed class SettingsCreator
{
    private readonly IList<string> _warnings = new List<string>();
    private readonly string _uiFolder;
    private readonly Dictionary<string, JsonNode> _settingsCollection = new();

    public SettingsCreator(string uiFolder)
    {
        _uiFolder = uiFolder;
    }

    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    public void Upgrade()
    {
        var layoutSets = Directory.GetDirectories(_uiFolder);
        foreach (var layoutSet in layoutSets)
        {
            var settingsFileName = Path.Combine(layoutSet, "Settings.json");
            if (File.Exists(settingsFileName))
            {
                continue;
            }

            var layoutsFolder = Path.Combine(layoutSet, "layouts");
            if (!Directory.Exists(layoutsFolder))
            {
                var compactFilePath = string.Join(
                    Path.DirectorySeparatorChar,
                    layoutSet.Split(Path.DirectorySeparatorChar)[^2..]
                );
                _warnings.Add($"No layouts folder found in layoutset {compactFilePath}, skipping");
                continue;
            }

            var order = Directory
                .GetFiles(layoutsFolder, "*.json")
                .Select(f => $@"""{Path.GetFileNameWithoutExtension(f)}""")
                .ToList();

            var layoutSettingsJsonString =
                $@"{{""$schema"": ""https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json"", ""pages"": {{""order"": [{string.Join(", ", order)}]}}}}";

            var parsedJson =
                JsonNode.Parse(layoutSettingsJsonString)
                ?? throw new InvalidOperationException(
                    $"Failed to parse generated JSON string: {layoutSettingsJsonString}"
                );

            _settingsCollection.Add(settingsFileName, parsedJson);
        }
    }

    public async Task Write()
    {
        JsonSerializerOptions options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        await Task.WhenAll(
            _settingsCollection.Select(async settingsTuple =>
            {
                settingsTuple.Deconstruct(out var filePath, out var settingsJson);

                var settingsText = settingsJson.ToJsonString(options);
                await File.WriteAllTextAsync(filePath, settingsText);
            })
        );
    }
}
