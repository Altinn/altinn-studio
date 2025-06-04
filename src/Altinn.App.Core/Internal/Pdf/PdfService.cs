using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Service for handling the creation and storage of receipt Pdf.
/// </summary>
public class PdfService : IPdfService
{
    private readonly IAppResources _resourceService;
    private readonly IDataClient _dataClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IPdfGeneratorClient _pdfGeneratorClient;
    private readonly PdfGeneratorSettings _pdfGeneratorSettings;
    private readonly ILogger<PdfService> _logger;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly GeneralSettings _generalSettings;
    private readonly Telemetry? _telemetry;
    private const string PdfElementType = "ref-data-as-pdf";
    private const string PdfContentType = "application/pdf";

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfService"/> class.
    /// </summary>
    /// <param name="appResources">The service giving access to local resources.</param>
    /// <param name="dataClient">The data client.</param>
    /// <param name="httpContextAccessor">The httpContextAccessor</param>
    /// <param name="pdfGeneratorClient">PDF generator client for the experimental PDF generator service</param>
    /// <param name="pdfGeneratorSettings">PDF generator related settings.</param>
    /// <param name="generalSettings">The app general settings.</param>
    /// <param name="logger">The logger.</param>
    /// <param name="authenticationContext">The auth context.</param>
    /// <param name="telemetry">Telemetry for metrics and traces.</param>
    public PdfService(
        IAppResources appResources,
        IDataClient dataClient,
        IHttpContextAccessor httpContextAccessor,
        IPdfGeneratorClient pdfGeneratorClient,
        IOptions<PdfGeneratorSettings> pdfGeneratorSettings,
        IOptions<GeneralSettings> generalSettings,
        ILogger<PdfService> logger,
        IAuthenticationContext authenticationContext,
        Telemetry? telemetry = null
    )
    {
        _resourceService = appResources;
        _dataClient = dataClient;
        _httpContextAccessor = httpContextAccessor;
        _pdfGeneratorClient = pdfGeneratorClient;
        _pdfGeneratorSettings = pdfGeneratorSettings.Value;
        _generalSettings = generalSettings.Value;
        _logger = logger;
        _authenticationContext = authenticationContext;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task GenerateAndStorePdf(Instance instance, string taskId, CancellationToken ct)
    {
        using var activity = _telemetry?.StartGenerateAndStorePdfActivity(instance, taskId);

        HttpContext? httpContext = _httpContextAccessor.HttpContext;
        var queries = httpContext?.Request.Query;
        var auth = _authenticationContext.Current;

        var language = GetOverriddenLanguage(queries) ?? await auth.GetLanguage();

        TextResource? textResource = await GetTextResource(instance, language);

        var pdfContent = await GeneratePdfContent(instance, language, false, textResource, ct);

        string fileName = GetFileName(instance, textResource);
        await _dataClient.InsertBinaryData(instance.Id, PdfElementType, PdfContentType, fileName, pdfContent, taskId);
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Instance instance, string taskId, bool isPreview, CancellationToken ct)
    {
        using var activity = _telemetry?.StartGeneratePdfActivity(instance, taskId);

        HttpContext? httpContext = _httpContextAccessor.HttpContext;
        var queries = httpContext?.Request.Query;
        var auth = _authenticationContext.Current;

        var language = GetOverriddenLanguage(queries) ?? await auth.GetLanguage();

        TextResource? textResource = await GetTextResource(instance, language);

        return await GeneratePdfContent(instance, language, isPreview, textResource, ct);
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Instance instance, string taskId, CancellationToken ct)
    {
        return await GeneratePdf(instance, taskId, false, ct);
    }

    private async Task<Stream> GeneratePdfContent(
        Instance instance,
        string language,
        bool isPreview,
        TextResource? textResource,
        CancellationToken ct
    )
    {
        var baseUrl = _generalSettings.FormattedExternalAppBaseUrl(new AppIdentifier(instance));
        var pagePath = _pdfGeneratorSettings
            .AppPdfPagePathTemplate.ToLowerInvariant()
            .Replace("{instanceid}", instance.Id);

        Uri uri = BuildUri(baseUrl, pagePath, language);

        bool displayFooter = _pdfGeneratorSettings.DisplayFooter;

        string? footerContent = null;

        if (isPreview)
        {
            footerContent = GetPreviewFooter(textResource);
        }
        else if (displayFooter)
        {
            footerContent = GetFooterContent(instance, textResource);
        }

        Stream pdfContent = await _pdfGeneratorClient.GeneratePdf(uri, footerContent, ct);

        return pdfContent;
    }

    private static Uri BuildUri(string baseUrl, string pagePath, string language)
    {
        // Uses string manipulation instead of UriBuilder, since UriBuilder messes up
        // query parameters in combination with hash fragments in the url.
        string url = baseUrl + pagePath;
        if (url.Contains('?'))
        {
            url += $"&lang={language}";
        }
        else
        {
            url += $"?lang={language}";
        }

        return new Uri(url);
    }

    internal static string? GetOverriddenLanguage(IQueryCollection? queries)
    {
        if (queries is null)
        {
            return null;
        }

        if (
            queries.TryGetValue("language", out StringValues queryLanguage)
            || queries.TryGetValue("lang", out queryLanguage)
        )
        {
            return queryLanguage.ToString();
        }

        return null;
    }

    private async Task<TextResource?> GetTextResource(Instance instance, string language)
    {
        var appIdentifier = new AppIdentifier(instance);
        string org = appIdentifier.Org;
        string app = appIdentifier.App;
        TextResource? textResource = await _resourceService.GetTexts(org, app, language);

        if (textResource == null && language != LanguageConst.Nb)
        {
            // fallback to norwegian if texts does not exist
            textResource = await _resourceService.GetTexts(org, app, LanguageConst.Nb);
        }

        return textResource;
    }

    private static string GetFileName(Instance instance, TextResource? textResource)
    {
        string? fileName = null;
        string app = instance.AppId.Split("/")[1];

        fileName = $"{app}.pdf";

        if (textResource is null)
        {
            return GetValidFileName(fileName);
        }

        string? titleText = GetTitleText(textResource);

        if (!string.IsNullOrEmpty(titleText))
        {
            fileName = titleText + ".pdf";
        }

        return GetValidFileName(fileName);
    }

    private static string? GetTitleText(TextResource? textResource)
    {
        if (textResource is not null)
        {
            TextResourceElement? titleText =
                textResource.Resources.Find(textResourceElement =>
                    textResourceElement.Id.Equals("appName", StringComparison.Ordinal)
                )
                ?? textResource.Resources.Find(textResourceElement =>
                    textResourceElement.Id.Equals("ServiceName", StringComparison.Ordinal)
                );

            if (titleText is not null)
            {
                return titleText.Value;
            }
        }

        return null;
    }

    private static string GetPdfPreviewText(TextResource? textResource)
    {
        if (textResource is not null)
        {
            TextResourceElement? titleText = textResource.Resources.Find(textResourceElement =>
                textResourceElement.Id.Equals("pdfPreviewText", StringComparison.Ordinal)
            );

            if (titleText is not null)
            {
                return titleText.Value;
            }
        }

        return "Dokumentet er en forhåndsvisning";
    }

    private static string GetValidFileName(string fileName)
    {
        fileName = Uri.EscapeDataString(fileName.AsFileName(false));
        return fileName;
    }

    private static string GetPreviewFooter(TextResource? textResource)
    {
        string previewText = GetPdfPreviewText(textResource);
        return $@"<div style='font-family: Inter; font-size: 12px; width: 100%; display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 0 70px 0 70px;'>
                <div style='display: flex; flex-direction: row; width: 100%; align-items: center; font-style: italic; color: #e02e49;'>
                    <span>{previewText}</span>
                </div>
            </div>";
    }

    private string GetFooterContent(Instance instance, TextResource? textResource)
    {
        TimeZoneInfo timeZone = TimeZoneInfo.Utc;
        try
        {
            // attempt to set timezone to norwegian
            timeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Oslo");
        }
        catch (TimeZoneNotFoundException e)
        {
            _logger.LogWarning($"Could not find timezone Europe/Oslo. Defaulting to UTC. {e.Message}");
        }

        DateTimeOffset now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);

        string title = GetTitleText(textResource) ?? "Altinn";

        string dateGenerated = now.ToString("dd.MM.yyyy HH:mm", new CultureInfo("nb-NO"));
        string altinnReferenceId = instance.Id.Split("/")[1].Split("-")[4];

        string footerTemplate =
            $@"<div style='font-family: Inter; font-size: 12px; width: 100%; display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 0 70px 0 70px;'>
                <div style='display: flex; flex-direction: row; width: 100%; align-items: center'>
                    <span>{title}</span>
                    <div
                        id='header-template'
                        style='color: #F00; font-weight: 700; border: 1px solid #F00; padding: 6px 8px; margin-left: auto;'
                    >
                        <span>{dateGenerated} </span>
                        <span>ID:{altinnReferenceId}</span>
                    </div>
                </div>
                <div style='display: flex; flex-direction-row; align-items: center;'>
                    <span class='pageNumber'></span>
                    /
                    <span class='totalPages'></span>
                </div>
            </div>";
        return footerTemplate;
    }
}
