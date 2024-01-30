using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Fev3Tov4.FooterRewriter;

/// <summary>
/// Fixes footer accessibility link if present, if not adds a default footer
/// Should be run before SchemaRefUpgrader
/// </summary>
class FooterUpgrader
{
    private readonly IList<string> warnings = new List<string>();
    private JsonNode? footer;
    private readonly string uiFolder;

    public FooterUpgrader(string uiFolder)
    {
        this.uiFolder = uiFolder;
    }

    public IList<string> GetWarnings()
    {
        return warnings;
    }

    public void Upgrade()
    {
        var footerFile = Path.Join(uiFolder, "footer.json");
        if (File.Exists(footerFile))
        {
            var footerJson = JsonNode.Parse(File.ReadAllText(footerFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
            if (footerJson is JsonObject footerJsonObject && footerJsonObject.TryGetPropertyValue("footer", out var footerNode) && footerNode is JsonArray footerArray)
            {
                foreach (var footerItem in footerArray)
                {
                    if (
                        footerItem is JsonObject footerItemObject
                        && footerItemObject.TryGetPropertyValue("type", out var typeNode)
                        && typeNode is JsonValue typeValue
                        && typeValue.GetValueKind() == JsonValueKind.String
                        && typeValue.GetValue<string>() == "Link"
                        && footerItemObject.TryGetPropertyValue("target", out var targetNode)
                        && targetNode is JsonValue targetValue
                        && targetValue.GetValueKind() == JsonValueKind.String
                        && targetValue.GetValue<string>() == "https://www.altinn.no/om-altinn/tilgjengelighet/"
                    ) { 
                        footerItemObject["target"] = JsonValue.Create("general.accessibility_url");
                    }
                }
                footer = footerJson;
            }
            else
            {
                warnings.Add($"Unable to parse footer.json, skipping footer upgrade");
            }
        }
        else
        {
            footer = JsonNode.Parse(@"{ ""$schema"": ""https://altinncdn.no/schemas/json/layout/footer.schema.v1.json"", ""footer"": [ { ""type"": ""Link"", ""icon"": ""information"", ""title"": ""general.accessibility"", ""target"": ""general.accessibility_url"" } ] }");
        }
    }

    public async Task Write()
    {
        if (footer == null)
        {
            return;
        }

        JsonSerializerOptions options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        var footerText = footer.ToJsonString(options);
        await File.WriteAllTextAsync(Path.Join(uiFolder, "footer.json"), footerText);
    }
}
