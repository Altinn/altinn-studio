using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Fev3Tov4.SettingsWriter;

/// <summary>
/// Creates basic Settings.json file for all layout sets that are missing one
/// Must be run after LayoutSetUpgrader
/// </summary>
class SettingsCreator
{
    private readonly IList<string> warnings = new List<string>();
    private readonly string uiFolder;
    private Dictionary<string, JsonNode> settingsCollection = new Dictionary<string, JsonNode>();

    public SettingsCreator(string uiFolder)
    {
        this.uiFolder = uiFolder;
    }

    public IList<string> GetWarnings()
    {
        return warnings;
    }

    public void Upgrade() {

        var layoutSets = Directory.GetDirectories(uiFolder);
        foreach (var layoutSet in layoutSets)
        {
          var settingsFileName = Path.Combine(layoutSet, "Settings.json");
          if (File.Exists(settingsFileName))
          {
            continue;
          }

          var order = Directory.GetFiles(Path.Combine(layoutSet, "layouts"), "*.json").Select(f => $@"""{Path.GetFileNameWithoutExtension(f)}""").ToList();

          var layoutSettingsJsonString = $@"{{""$schema"": ""https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json"", ""pages"": {{""order"": [{string.Join(", ", order)}]}}}}";
          settingsCollection.Add(settingsFileName, JsonNode.Parse(layoutSettingsJsonString)!);
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
            settingsCollection.Select(async settingsTuple =>
            {
                settingsTuple.Deconstruct(out var filePath, out var settingsJson);

                var settingsText = settingsJson.ToJsonString(options);
                await File.WriteAllTextAsync(filePath, settingsText);
            })
        );
    }
}
