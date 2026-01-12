using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Generates frontend.json configuration from analysis results
/// </summary>
internal sealed class FrontendConfigGenerator
{
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IndexAnalysisResult _analysisResult;

    public FrontendConfigGenerator(IndexAnalysisResult analysisResult)
    {
        _analysisResult = analysisResult;
    }

    /// <summary>
    /// Generates FrontendConfiguration containing only external URLs
    /// </summary>
    /// <returns>Frontend configuration object</returns>
    public FrontendConfiguration Generate()
    {
        return new FrontendConfiguration
        {
            Stylesheets = _analysisResult.CustomCss.ExternalStylesheets.ToList(),
            Scripts = _analysisResult.CustomJavaScript.ExternalScripts.ToList(),
        };
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

        var json = JsonSerializer.Serialize(config, s_jsonOptions);
        await File.WriteAllTextAsync(outputPath, json);
    }
}
