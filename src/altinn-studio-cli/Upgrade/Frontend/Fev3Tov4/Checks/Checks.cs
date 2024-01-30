using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.Checks;

/// <summary>
/// Checks for known issues in the app
/// </summary>
class Checker
{
    private readonly IList<string> warnings = new List<string>();
    private readonly string textsFolder;

    public Checker(string textsFolder)
    {
        this.textsFolder = textsFolder;
    }

    public void CheckTextDataModelReferences()
    {
        var textResourceFiles = Directory.GetFiles(textsFolder, "*.json");
        foreach (var textResourceFile in textResourceFiles)
        {
            var compactFilePath = string.Join(Path.DirectorySeparatorChar, textResourceFile.Split(Path.DirectorySeparatorChar)[^2..]);
            var textResourceNode = JsonNode.Parse(File.ReadAllText(textResourceFile), null, new JsonDocumentOptions() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
            if (
                textResourceNode is JsonObject textResourceObject
                && textResourceObject.TryGetPropertyValue("resources", out var resourcesNode)
                && resourcesNode is JsonArray resourcesArray
            ) { 
                foreach (var resourceNode in resourcesArray) {
                    if (
                        resourceNode is JsonObject resourceObject
                        && resourceObject.TryGetPropertyValue("variables", out var variablesNode)
                        && variablesNode is JsonArray variablesArray
                    )
                    {
                        foreach (var variableNode in variablesArray)
                        {
                            if (
                                variableNode is JsonObject variableObject
                                && variableObject.TryGetPropertyValue(
                                    "dataSource",
                                    out var dataSourceNode
                                )
                                && dataSourceNode is JsonValue dataSourceValue
                                && dataSourceValue.GetValueKind() == JsonValueKind.String
                                && dataSourceValue.GetValue<string>() == "dataModel.default"
                            ) { 
                                warnings.Add($@"Found ""dataSource"": ""dataModel.default"" in {compactFilePath}, this is not recommended in v4. Please consider referring to a specific data model instead.");
                            }
                        }
                    }
                }
            }
            else
            {
                warnings.Add($"Unable to parse {compactFilePath}, skipping check");
            }
        }
    }

    public IList<string> GetWarnings()
    {
        return warnings.Distinct().ToList();
    }
}
