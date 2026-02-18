using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Generates assets.json configuration from categorization results
/// </summary>
internal sealed class AssetsConfigGenerator
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly CategorizationResult _categorizationResult;
    private readonly string? _org;
    private readonly string? _app;

    public AssetsConfigGenerator(CategorizationResult categorizationResult, string? org = null, string? app = null)
    {
        _categorizationResult = categorizationResult;
        _org = org;
        _app = app;
    }

    /// <summary>
    /// Generates FrontendConfiguration containing external assets with their attributes
    /// </summary>
    /// <returns>Frontend configuration object</returns>
    public BrowserAssetsConfiguration Generate()
    {
        var externalStylesheets = _categorizationResult
            .KnownCustomizations.Where(c =>
                c.CustomizationType == CustomizationType.ExternalStylesheet && c.Asset != null
            )
            .Select(c => c.Asset)
            .OfType<BrowserStylesheet>()
            .Select(ReplaceViewBagPlaceholders)
            .ToList();

        var externalScripts = _categorizationResult
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.ExternalScript && c.Asset != null)
            .Select(c => c.Asset)
            .OfType<BrowserScript>()
            .Select(ReplaceViewBagPlaceholders)
            .ToList();

        return new BrowserAssetsConfiguration { Stylesheets = externalStylesheets, Scripts = externalScripts };
    }

    /// <summary>
    /// Replaces @ViewBag.Org and @ViewBag.App placeholders in stylesheet URLs with actual values
    /// </summary>
    private BrowserStylesheet ReplaceViewBagPlaceholders(BrowserStylesheet asset)
    {
        var url = ReplaceUrlPlaceholders(asset.Url);
        if (url == asset.Url)
        {
            return asset;
        }

        return new BrowserStylesheet
        {
            Url = url,
            Crossorigin = asset.Crossorigin,
            Integrity = asset.Integrity,
            Media = asset.Media,
        };
    }

    /// <summary>
    /// Replaces @ViewBag.Org and @ViewBag.App placeholders in script URLs with actual values
    /// </summary>
    private BrowserScript ReplaceViewBagPlaceholders(BrowserScript asset)
    {
        var url = ReplaceUrlPlaceholders(asset.Url);
        if (url == asset.Url)
        {
            return asset;
        }

        return new BrowserScript
        {
            Url = url,
            Type = asset.Type,
            Async = asset.Async,
            Defer = asset.Defer,
            Nomodule = asset.Nomodule,
            Crossorigin = asset.Crossorigin,
            Integrity = asset.Integrity,
        };
    }

    private string ReplaceUrlPlaceholders(string url)
    {
        if (_org != null)
        {
            url = url.Replace("@ViewBag.Org", _org, StringComparison.Ordinal);
        }

        if (_app != null)
        {
            url = url.Replace("@ViewBag.App", _app, StringComparison.Ordinal);
        }

        return url;
    }

    /// <summary>
    /// Writes the configuration to a JSON file
    /// </summary>
    /// <param name="outputPath">Path to write the assets.json file</param>
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
