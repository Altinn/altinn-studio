using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.App;

internal sealed class IndexPageGenerator : IIndexPageGenerator
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IFrontendFeatures _frontendFeatures;
    private readonly AppFilesAccessor _appFiles;

    public IndexPageGenerator(IFrontendFeatures frontendFeatures, AppFilesAccessor appFiles)
    {
        _frontendFeatures = frontendFeatures;
        _appFiles = appFiles;
    }

    public bool HasLegacyIndexCshtml => _appFiles.Current.HasLegacyIndexPage;

    public Task<string> Generate(
        string org,
        string app,
        BootstrapGlobalResponse appGlobalState,
        string? appFrontendAssetBaseUrl = null
    )
    {
        appFrontendAssetBaseUrl ??= $"/{org}/{app}/altinn-app-frontend";

        var featureToggles = _frontendFeatures.GetDictionary();
        var featureTogglesJson = JsonSerializer.Serialize(featureToggles, _jsonSerializerOptions);
        var globalDataJson = JsonSerializer.Serialize(appGlobalState, _jsonSerializerOptions);

        var files = _appFiles.Current;
        var frontendAssets = files.FrontendAssets is { } assetsJson
            ? JsonSerializer.Deserialize<BrowserAssetsConfiguration>(assetsJson.Span, _jsonSerializerOptions)
            : null;

        var externalStylesheets = string.Concat(frontendAssets?.Stylesheets.Select(GenerateStylesheetTag) ?? []);
        var customCssLinks = string.Join(
            "\n",
            files
                .GetCustomCssFileNames()
                .Select(f => $"<link rel=\"stylesheet\" type=\"text/css\" href=\"/{org}/{app}/custom-css/{f}\">")
        );

        var externalScripts = string.Concat(frontendAssets?.Scripts.Select(GenerateScriptTag) ?? []);
        var customJsScripts = string.Join(
            "\n",
            files.GetCustomJsFileNames().Select(f => $"<script src=\"/{org}/{app}/custom-js/{f}\"></script>")
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
              <link rel="stylesheet" type="text/css" href="{{appFrontendAssetBaseUrl}}/altinn-app-frontend.css">
            {{externalStylesheets}}{{customCssLinks}}</head>
            <body>
              <div id="root"></div>
              <script>
                window.org = '{{org}}';
                window.app = '{{app}}';
                window.featureToggles = {{featureTogglesJson}};
                window.altinnAppGlobalData = {{globalDataJson}};
              </script>
              <script src="{{appFrontendAssetBaseUrl}}/altinn-app-frontend.js" crossorigin></script>
            {{externalScripts}}{{customJsScripts}}</body>
            </html>
            """;

        return Task.FromResult(htmlContent);
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
