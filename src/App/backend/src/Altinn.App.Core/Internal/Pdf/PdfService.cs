using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Texts;
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
    private readonly IDataClient _dataClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IPdfGeneratorClient _pdfGeneratorClient;
    private readonly PdfGeneratorSettings _pdfGeneratorSettings;
    private readonly ILogger<PdfService> _logger;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly ITranslationService _translationService;
    private readonly GeneralSettings _generalSettings;
    private readonly Telemetry? _telemetry;
    private const string PdfElementType = "ref-data-as-pdf";
    private const string PdfContentType = "application/pdf";

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfService"/> class.
    /// </summary>
    public PdfService(
        IDataClient dataClient,
        IHttpContextAccessor httpContextAccessor,
        IPdfGeneratorClient pdfGeneratorClient,
        IOptions<PdfGeneratorSettings> pdfGeneratorSettings,
        IOptions<GeneralSettings> generalSettings,
        ILogger<PdfService> logger,
        IAuthenticationContext authenticationContext,
        ITranslationService translationService,
        Telemetry? telemetry = null
    )
    {
        _dataClient = dataClient;
        _httpContextAccessor = httpContextAccessor;
        _pdfGeneratorClient = pdfGeneratorClient;
        _pdfGeneratorSettings = pdfGeneratorSettings.Value;
        _generalSettings = generalSettings.Value;
        _logger = logger;
        _authenticationContext = authenticationContext;
        _translationService = translationService;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task GenerateAndStorePdf(Instance instance, string taskId, CancellationToken ct)
    {
        using var activity = _telemetry?.StartGenerateAndStorePdfActivity(instance, taskId);

        await GenerateAndStorePdfInternal(instance, taskId, null, null, ct);
    }

    /// <inheritdoc/>
    public async Task GenerateAndStorePdf(
        Instance instance,
        string taskId,
        string? customFileNameTextResourceKey,
        List<string>? autoGeneratePdfForTaskIds = null,
        CancellationToken ct = default
    )
    {
        using var activity = _telemetry?.StartGenerateAndStorePdfActivity(instance, taskId);

        await GenerateAndStorePdfInternal(
            instance,
            taskId,
            customFileNameTextResourceKey,
            autoGeneratePdfForTaskIds,
            ct
        );
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Instance instance, string taskId, bool isPreview, CancellationToken ct)
    {
        using var activity = _telemetry?.StartGeneratePdfActivity(instance, taskId);

        HttpContext? httpContext = _httpContextAccessor.HttpContext;
        var queries = httpContext?.Request.Query;
        var auth = _authenticationContext.Current;

        var language = GetOverriddenLanguage(queries) ?? await auth.GetLanguage();

        return await GeneratePdfContent(instance, language, isPreview, null, ct);
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(Instance instance, string taskId, CancellationToken ct)
    {
        return await GeneratePdf(instance, taskId, false, ct);
    }

    private async Task GenerateAndStorePdfInternal(
        Instance instance,
        string taskId,
        string? customFileNameTextResourceKey,
        List<string>? autoGeneratePdfForTaskIds = null,
        CancellationToken ct = default
    )
    {
        HttpContext? httpContext = _httpContextAccessor.HttpContext;
        var queries = httpContext?.Request.Query;
        var auth = _authenticationContext.Current;

        var language = GetOverriddenLanguage(queries) ?? await auth.GetLanguage();

        await using Stream pdfContent = await GeneratePdfContent(
            instance,
            language,
            false,
            autoGeneratePdfForTaskIds,
            ct
        );

        string fileName = await GetFileName(language, customFileNameTextResourceKey);
        await _dataClient.InsertBinaryData(
            instance.Id,
            PdfElementType,
            PdfContentType,
            fileName,
            pdfContent,
            taskId,
            cancellationToken: ct
        );
    }

    private async Task<Stream> GeneratePdfContent(
        Instance instance,
        string language,
        bool isPreview,
        List<string>? autoGeneratePdfForTaskIds,
        CancellationToken ct
    )
    {
        var baseUrl = _generalSettings.FormattedExternalAppBaseUrl(new AppIdentifier(instance));
        var pagePath = _pdfGeneratorSettings
            .AppPdfPagePathTemplate.ToLowerInvariant()
            .Replace("{instanceid}", instance.Id);

        List<KeyValuePair<string, string>> autoPdfTaskIdsQueryParams = CreateAutoPdfTaskIdsQueryParams(
            autoGeneratePdfForTaskIds
        );

        Uri uri = BuildUri(baseUrl, pagePath, language, autoPdfTaskIdsQueryParams);

        bool displayFooter = _pdfGeneratorSettings.DisplayFooter;

        string? footerContent = null;

        if (isPreview)
        {
            footerContent = await GetPreviewFooter(language);
        }
        else if (displayFooter)
        {
            footerContent = await GetFooterContent(instance, language);
        }

        Stream pdfContent = await _pdfGeneratorClient.GeneratePdf(uri, footerContent, ct);

        return pdfContent;
    }

    private static Uri BuildUri(
        string baseUrl,
        string pagePath,
        string language,
        List<KeyValuePair<string, string>>? additionalQueryParams = null
    )
    {
        // Uses string manipulation instead of UriBuilder, since UriBuilder messes up
        // query parameters in combination with hash fragments in the url.
        string url = baseUrl + pagePath;
        string lang = Uri.EscapeDataString(language);
        if (url.Contains('?'))
        {
            url += $"&lang={lang}";
        }
        else
        {
            url += $"?lang={lang}";
        }

        if (additionalQueryParams != null)
        {
            foreach (KeyValuePair<string, string> param in additionalQueryParams)
            {
                url += $"&{param.Key}={param.Value}";
            }
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

    private async Task<string> GetFileName(string? language, string? customFileNameTextResourceKey)
    {
        string? titleText = await _translationService.TranslateTextKey(
            customFileNameTextResourceKey ?? "backend.pdf_default_file_name",
            language
        );

        if (string.IsNullOrEmpty(titleText))
        {
            // translation for backend.pdf_default_file_name should always be present (it has a falback in the translation service),
            // but just in case, we default to a hardcoded string.
            titleText = "Altinn PDF.pdf";
        }

        var file = GetValidFileName(titleText);
        return file.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? file : $"{file}.pdf";
    }

    private static string GetValidFileName(string fileName)
    {
        fileName = Uri.EscapeDataString(fileName.AsFileName(false));
        return fileName;
    }

    private async Task<string> GetPreviewFooter(string language)
    {
        var previewText = await _translationService.TranslateTextKey("pdfPreviewText", language);
        return $@"<div style='font-family: Inter; font-size: 12px; width: 100%; display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 0 70px 0 70px;'>
                <div style='display: flex; flex-direction: row; width: 100%; align-items: center; font-style: italic; color: #e02e49;'>
                    <span>{previewText}</span>
                </div>
            </div>";
    }

    private async Task<string> GetFooterContent(Instance instance, string? language)
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

        string title = await _translationService.TranslateTextKey("appName", language) ?? "Altinn";

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

    private static List<KeyValuePair<string, string>> CreateAutoPdfTaskIdsQueryParams(
        List<string>? autoGeneratePdfForTaskIds
    )
    {
        List<KeyValuePair<string, string>> additionalQueryParams = [];
        // Create query param array for autoGeneratePdfForTaskIds if provided, task=1&task=2 etc.
        if (autoGeneratePdfForTaskIds != null && autoGeneratePdfForTaskIds.Count != 0)
        {
            foreach (string taskId in autoGeneratePdfForTaskIds)
            {
                additionalQueryParams.Add(new KeyValuePair<string, string>("task", taskId));
            }
        }

        return additionalQueryParams;
    }
}
