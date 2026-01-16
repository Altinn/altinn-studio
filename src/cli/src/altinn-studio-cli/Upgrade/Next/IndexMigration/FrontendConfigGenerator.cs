using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Generates frontend.json configuration from categorization results
/// </summary>
internal sealed class FrontendConfigGenerator
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly CategorizationResult _categorizationResult;

    public FrontendConfigGenerator(CategorizationResult categorizationResult)
    {
        _categorizationResult = categorizationResult;
    }

    /// <summary>
    /// Generates FrontendConfiguration containing external assets with their attributes
    /// </summary>
    /// <returns>Frontend configuration object</returns>
    public FrontendConfiguration Generate()
    {
        var externalStylesheets = _categorizationResult
            .KnownCustomizations.Where(c =>
                c.CustomizationType == CustomizationType.ExternalStylesheet && c.Asset != null
            )
            .Select(c => c.Asset)
            .OfType<FrontendAsset>()
            .ToList();

        var externalScripts = _categorizationResult
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.ExternalScript && c.Asset != null)
            .Select(c => c.Asset)
            .OfType<FrontendAsset>()
            .ToList();

        return new FrontendConfiguration { Stylesheets = externalStylesheets, Scripts = externalScripts };
    }

    /// <summary>
    /// Writes the configuration to a JSON file
    /// </summary>
    /// <param name="outputPath">Path to write the frontend.json file</param>
    public async Task WriteToFile(string outputPath)
    {
        var config = Generate();
        if (!config.HasContent)
        {
            return;
        }

        var directory = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var json = JsonSerializer.Serialize(config, _jsonOptions);
        await File.WriteAllTextAsync(outputPath, json);
    }
}
