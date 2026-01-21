using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.App;

internal sealed class IndexPageGenerator : IIndexPageGenerator
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly object _cacheLock = new();
    private static bool _cacheInitialized;
    private static bool _hasLegacyIndexCshtml;
    private static BrowserAssetsConfiguration? _cachedFrontendConfig;
    private static IReadOnlyList<string> _cachedCustomCssFileNames = [];
    private static IReadOnlyList<string> _cachedCustomJsFileNames = [];

    private readonly IFrontendFeatures _frontendFeatures;
    private readonly AppSettings _appSettings;

    public IndexPageGenerator(IFrontendFeatures frontendFeatures, IOptions<AppSettings> appSettings)
    {
        _frontendFeatures = frontendFeatures;
        _appSettings = appSettings.Value;
        EnsureCacheInitialized(_appSettings);
    }

    public bool HasLegacyIndexCshtml => _hasLegacyIndexCshtml;

    public async Task<string> Generate(
        string org,
        string app,
        BootstrapGlobalResponse appGlobalState,
        string? frontendVersionOverride = null
    )
    {
        var frontendUrl = frontendVersionOverride ?? "https://altinncdn.no/toolkits/altinn-app-frontend/4";

        var featureToggles = await _frontendFeatures.GetFrontendFeatures();
        var featureTogglesJson = JsonSerializer.Serialize(featureToggles, _jsonSerializerOptions);
        var globalDataJson = JsonSerializer.Serialize(appGlobalState, _jsonSerializerOptions);

        var externalStylesheets = string.Concat(_cachedFrontendConfig?.Stylesheets.Select(GenerateStylesheetTag) ?? []);
        var customCssLinks = string.Join(
            "\n",
            _cachedCustomCssFileNames.Select(f =>
                $"<link rel=\"stylesheet\" type=\"text/css\" href=\"/{org}/{app}/custom-css/{f}\">"
            )
        );

        var externalScripts = string.Concat(_cachedFrontendConfig?.Scripts.Select(GenerateScriptTag) ?? []);
        var customJsScripts = string.Join(
            "\n",
            _cachedCustomJsFileNames.Select(f => $"<script src=\"/{org}/{app}/custom-js/{f}\"></script>")
        );

        var htmlContent = $$"""
            <!DOCTYPE html>
            <html lang="no">
            <head>
              <meta charset="utf-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
              <title>{{org}} - {{app}}</title>
              <link rel="icon" href="https://altinncdn.no/favicon.ico">
              <link rel="stylesheet" type="text/css" href="{{frontendUrl}}/altinn-app-frontend.css">
            {{externalStylesheets}}{{customCssLinks}}</head>
            <body>
              <div id="root"></div>
              <script>
                window.org = '{{org}}';
                window.app = '{{app}}';
                window.featureToggles = {{featureTogglesJson}};
                window.altinnAppGlobalData = {{globalDataJson}};
              </script>
              <script src="{{frontendUrl}}/altinn-app-frontend.js" crossorigin></script>
            {{externalScripts}}{{customJsScripts}}</body>
            </html>
            """;

        return htmlContent;
    }

    private static void EnsureCacheInitialized(AppSettings appSettings)
    {
        if (_cacheInitialized)
            return;

        lock (_cacheLock)
        {
            if (_cacheInitialized)
                return;

            var indexCshtmlPath = Path.Join(appSettings.AppBasePath, "views", "Home", "Index.cshtml");
            _hasLegacyIndexCshtml = File.Exists(indexCshtmlPath);

            var configPath = Path.Join(appSettings.AppBasePath, appSettings.ConfigurationFolder, "assets.json");
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                _cachedFrontendConfig = JsonSerializer.Deserialize<BrowserAssetsConfiguration>(
                    json,
                    _jsonSerializerOptions
                );
            }

            _cachedCustomCssFileNames = GetFileNames(appSettings, "custom-css");
            _cachedCustomJsFileNames = GetFileNames(appSettings, "custom-js");
            _cacheInitialized = true;
        }
    }

    private static List<string> GetFileNames(AppSettings appSettings, string subfolder)
    {
        var dir = Path.Join(appSettings.AppBasePath, "wwwroot", subfolder);
        if (!Directory.Exists(dir))
            return [];

        return Directory.GetFiles(dir).Order().Select(Path.GetFileName).OfType<string>().ToList();
    }

    private static string GenerateStylesheetTag(BrowserStylesheet stylesheet)
    {
        var sb = new StringBuilder("  <link rel=\"stylesheet\" type=\"text/css\"");
        sb.Append(" href=\"").Append(stylesheet.Url).Append('"');

        if (!string.IsNullOrEmpty(stylesheet.Media))
            sb.Append(" media=\"").Append(stylesheet.Media).Append('"');

        if (!string.IsNullOrEmpty(stylesheet.Integrity))
            sb.Append(" integrity=\"").Append(stylesheet.Integrity).Append('"');

        if (stylesheet.Crossorigin)
            sb.Append(" crossorigin=\"anonymous\"");

        sb.AppendLine(">");
        return sb.ToString();
    }

    private static string GenerateScriptTag(BrowserScript script)
    {
        var sb = new StringBuilder("  <script");
        sb.Append(" src=\"").Append(script.Url).Append('"');

        if (script.Type is not null)
            sb.Append(" type=\"module\"");

        if (script.Async)
            sb.Append(" async");

        if (script.Defer)
            sb.Append(" defer");

        if (script.Nomodule)
            sb.Append(" nomodule");

        if (script.Crossorigin)
            sb.Append(" crossorigin=\"anonymous\"");

        if (!string.IsNullOrEmpty(script.Integrity))
            sb.Append(" integrity=\"").Append(script.Integrity).Append('"');

        sb.AppendLine("></script>");
        return sb.ToString();
    }
}
