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
    /// Generates FrontendConfiguration containing only external URLs
    /// </summary>
    /// <returns>Frontend configuration object</returns>
    public FrontendConfiguration Generate()
    {
        var externalStylesheets = _categorizationResult
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.ExternalStylesheet)
            .Select(c => c.ExtractionHint)
            .ToList();

        var externalScripts = _categorizationResult
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.ExternalScript)
            .Select(c => c.ExtractionHint)
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

        // Only write if there's content to write
        if (!config.HasContent)
        {
            return;
        }

        // Ensure directory exists
        var directory = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var json = JsonSerializer.Serialize(config, _jsonOptions);
        await File.WriteAllTextAsync(outputPath, json);
    }
}
