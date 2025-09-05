using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.AppSettingsRewriter;

/// <summary>
/// Rewrites the appsettings.*.json files
/// </summary>
internal sealed class AppSettingsRewriter
{
    /// <summary>
    /// The pattern used to search for appsettings.*.json files
    /// </summary>
    public const string AppSettingsFilePattern = "appsettings*.json";

    private readonly Dictionary<string, JsonObject> _appSettingsJsonCollection;

    private readonly IList<string> _warnings = new List<string>();

    private readonly JsonDocumentOptions _jsonDocumentOptions = new JsonDocumentOptions()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="AppSettingsRewriter"/> class.
    /// </summary>
    public AppSettingsRewriter(string appSettingsFolder)
    {
        _appSettingsJsonCollection = new Dictionary<string, JsonObject>();
        foreach (var file in Directory.GetFiles(appSettingsFolder, AppSettingsFilePattern))
        {
            var json = File.ReadAllText(file);
            var appSettingsJson = JsonNode.Parse(json, null, _jsonDocumentOptions);
            if (appSettingsJson is not JsonObject appSettingsJsonObject)
            {
                _warnings.Add($"Unable to parse AppSettings file {file} as a json object, skipping");
                continue;
            }

            this._appSettingsJsonCollection.Add(file, appSettingsJsonObject);
        }
    }

    /// <summary>
    /// Gets the warnings
    /// </summary>
    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    /// <summary>
    /// Upgrades the appsettings.*.json files
    /// </summary>
    public void Upgrade()
    {
        foreach ((var fileName, var appSettingsJson) in _appSettingsJsonCollection)
        {
            RewriteRemoveHiddenDataSetting(fileName, appSettingsJson);
        }
    }

    /// <summary>
    /// Writes the appsettings.*.json files
    /// </summary>
    public async Task Write()
    {
        var tasks = _appSettingsJsonCollection.Select(async appSettingsFiles =>
        {
            appSettingsFiles.Deconstruct(out var fileName, out var appSettingsJson);

            JsonSerializerOptions options = new JsonSerializerOptions { WriteIndented = true };
            await File.WriteAllTextAsync(fileName, appSettingsJson.ToJsonString(options));
        });

        await Task.WhenAll(tasks);
    }

    private void RewriteRemoveHiddenDataSetting(string fileName, JsonObject settings)
    {
        try
        {
            // Look for "AppSettings" object
            settings.TryGetPropertyValue("AppSettings", out var appSettingsNode);
            if (appSettingsNode is not JsonObject appSettingsObject)
            {
                // No "AppSettings" object found, nothing to change
                return;
            }

            // Look for "RemoveHiddenDataPreview" property
            appSettingsObject.TryGetPropertyValue("RemoveHiddenDataPreview", out var removeHiddenDataPreviewNode);

            if (removeHiddenDataPreviewNode is not JsonValue removeHiddenDataPreviewValue)
            {
                // No "RemoveHiddenDataPreview" property found, nothing to change
                return;
            }

            // Get value of "RemoveHiddenDataPreview" property
            if (!removeHiddenDataPreviewValue.TryGetValue<bool>(out var removeHiddenDataValue))
            {
                _warnings.Add(
                    $"RemoveHiddenDataPreview has unexpected value {removeHiddenDataPreviewValue.ToJsonString()} in {fileName}, expected a boolean"
                );
                return;
            }

            appSettingsObject.Remove("RemoveHiddenDataPreview");
            if (appSettingsObject.ContainsKey("RemoveHiddenData"))
            {
                _warnings.Add(
                    $"RemoveHiddenData already exists in AppSettings, skipping. Tool would have set the value to: {removeHiddenDataValue} in {fileName}"
                );
            }
            else
            {
                appSettingsObject.Add("RemoveHiddenData", removeHiddenDataValue);
            }

            if (appSettingsObject.ContainsKey("RequiredValidation"))
            {
                _warnings.Add(
                    $"RequiredValidation already exists in AppSettings, skipping. Tool would have set the value to: {removeHiddenDataValue} in {fileName}"
                );
            }
            else
            {
                appSettingsObject.Add("RequiredValidation", removeHiddenDataValue);
            }
        }
        catch (Exception e)
        {
            _warnings.Add(
                $"Unable to parse appsettings file {fileName}, error: {e.Message}. Skipping upgrade of RemoveHiddenDataPreview for this file"
            );
        }
    }
}
