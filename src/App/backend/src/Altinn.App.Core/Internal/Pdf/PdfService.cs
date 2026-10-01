using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Expressions;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Pdf;

/// <summary>
/// Generates PDFs of an instance with the PDF generator.
/// </summary>
internal sealed class PdfService : IPdfService
{
    private readonly IPdfGeneratorClient _pdfGeneratorClient;
    private readonly PdfGeneratorSettings _pdfGeneratorSettings;
    private readonly ILogger<PdfService> _logger;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly ITranslationService _translationService;
    private readonly GeneralSettings _generalSettings;
    private readonly IAppResources _resources;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly Telemetry? _telemetry;
    internal const string PdfElementType = "ref-data-as-pdf";
    internal const string PdfContentType = "application/pdf";

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfService"/> class.
    /// </summary>
    public PdfService(
        IPdfGeneratorClient pdfGeneratorClient,
        IOptions<PdfGeneratorSettings> pdfGeneratorSettings,
        IOptions<GeneralSettings> generalSettings,
        ILogger<PdfService> logger,
        IAuthenticationContext authenticationContext,
        ITranslationService translationService,
        IAppResources resources,
        InstanceDataUnitOfWorkInitializer instanceDataUnitOfWorkInitializer,
        Telemetry? telemetry = null
    )
    {
        _pdfGeneratorClient = pdfGeneratorClient;
        _pdfGeneratorSettings = pdfGeneratorSettings.Value;
        _generalSettings = generalSettings.Value;
        _logger = logger;
        _authenticationContext = authenticationContext;
        _translationService = translationService;
        _resources = resources;
        _instanceDataUnitOfWorkInitializer = instanceDataUnitOfWorkInitializer;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<Stream> GeneratePdf(
        Instance instance,
        string taskId,
        List<string>? autoGeneratePdfForTaskIds = null,
        string? language = null,
        bool isPreview = false,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        return await GeneratePdfInternal(
            instance,
            taskId,
            autoGeneratePdfForTaskIds,
            subformPdfContext: null,
            language,
            isPreview,
            authenticationMethod,
            cancellationToken
        );
    }

    /// <inheritdoc/>
    public async Task<Stream> GenerateSubformPdf(
        Instance instance,
        string taskId,
        SubformPdfContext subformPdfContext,
        string? language = null,
        bool isPreview = false,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        return await GeneratePdfInternal(
            instance,
            taskId,
            autoGeneratePdfForTaskIds: null,
            subformPdfContext,
            language,
            isPreview,
            authenticationMethod,
            cancellationToken
        );
    }

    private async Task<Stream> GeneratePdfInternal(
        Instance instance,
        string taskId,
        List<string>? autoGeneratePdfForTaskIds,
        SubformPdfContext? subformPdfContext,
        string? requestedLanguage,
        bool isPreview,
        StorageAuthenticationMethod? authenticationMethod,
        CancellationToken cancellationToken
    )
    {
        using var activity = _telemetry?.StartGeneratePdfActivity(instance, taskId);

        string language = string.IsNullOrWhiteSpace(requestedLanguage)
            ? await _authenticationContext.Current.GetLanguage()
            : requestedLanguage;

        return await GeneratePdfContent(
            instance,
            taskId,
            language,
            isPreview
                ? await GetPreviewFooter(language)
                : await GetFooterContent(instance, taskId, language, authenticationMethod),
            subformPdfContext,
            autoGeneratePdfForTaskIds,
            authenticationMethod,
            // The frontend renders the current task by default, so only another task goes in the URL
            includeTaskIdInUrl: taskId != instance.Process?.CurrentTask?.ElementId,
            cancellationToken
        );
    }

    private async Task<Stream> GeneratePdfContent(
        Instance instance,
        string taskId,
        string language,
        string? footerContent,
        SubformPdfContext? subformPdfContext,
        List<string>? autoGeneratePdfForTaskIds,
        StorageAuthenticationMethod? authenticationMethod,
        bool includeTaskIdInUrl,
        CancellationToken cancellationToken
    )
    {
        var baseUrl = _generalSettings.FormattedExternalAppBaseUrl(new AppIdentifier(instance));
        var pagePath = _pdfGeneratorSettings
            .AppPdfPagePathTemplate.ToLowerInvariant()
            .Replace("{instanceid}", instance.Id);

        List<KeyValuePair<string, string>> autoPdfTaskIdsQueryParams = CreateAutoPdfTaskIdsQueryParams(
            autoGeneratePdfForTaskIds
        );

        Uri uri = BuildUri(
            baseUrl,
            pagePath,
            taskId,
            language,
            subformPdfContext,
            includeTaskIdInUrl,
            autoPdfTaskIdsQueryParams
        );

        Stream pdfContent = await _pdfGeneratorClient.GeneratePdf(
            uri,
            footerContent,
            authenticationMethod,
            cancellationToken
        );

        return pdfContent;
    }

    private static Uri BuildUri(
        string baseUrl,
        string pagePath,
        string taskId,
        string language,
        SubformPdfContext? subformPdfContext,
        bool includeTaskIdInUrl,
        List<KeyValuePair<string, string>>? additionalQueryParams = null
    )
    {
        // Uses string manipulation instead of UriBuilder, since UriBuilder messes up
        // query parameters in combination with hash fragments in the url.
        string url = baseUrl + pagePath;

        // Insert subform component and data element id in the url if provided
        if (subformPdfContext is not null)
        {
            int pdfIndex = url.IndexOf("?pdf=1", StringComparison.OrdinalIgnoreCase);
            if (pdfIndex > 0)
            {
                string beforePdf = $"{url[..pdfIndex]}/{taskId}/subform";
                string afterPdf = url[pdfIndex..];
                url = $"{beforePdf}/{subformPdfContext.ComponentId}/{subformPdfContext.DataElementId}/{afterPdf}";
            }
            else
            {
                url += $"/{taskId}/subform/{subformPdfContext.ComponentId}/{subformPdfContext.DataElementId}";
            }
        }
        // Insert the task id in the url, so the frontend renders that task instead of the current one
        else if (includeTaskIdInUrl)
        {
            int pdfIndex = url.IndexOf("?pdf=1", StringComparison.OrdinalIgnoreCase);
            url = pdfIndex > 0 ? $"{url[..pdfIndex]}/{taskId}{url[pdfIndex..]}" : $"{url}/{taskId}";
        }

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

    private async Task<string> GetPreviewFooter(string language)
    {
        var previewText = await _translationService.TranslateTextKey("pdfPreviewText", language);
        return $@"<div style='font-family: Inter; font-size: 12px; width: 100%; display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 0 70px 0 70px;'>
                <div style='display: flex; flex-direction: row; width: 100%; align-items: center; font-style: italic; color: #e02e49;'>
                    <span>{previewText}</span>
                </div>
            </div>";
    }

    private async Task<string?> GetFooterContent(
        Instance instance,
        string taskId,
        string language,
        StorageAuthenticationMethod? authenticationMethod
    )
    {
        if (!_pdfGeneratorSettings.DisplayFooter)
        {
            return null;
        }

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

        bool hideAppName = await GetHideAppNameInPdf(instance, taskId, language, authenticationMethod);

        string dateGenerated = now.ToString("dd.MM.yyyy HH:mm", new CultureInfo("nb-NO"));
        string altinnReferenceId = instance.Id.Split("/")[1].Split("-")[4];

        string title = hideAppName
            ? string.Empty
            : $"<span>{await _translationService.TranslateTextKey("appName", language) ?? "Altinn"}</span>";

        string footerTemplate =
            $@"<div style='font-family: Inter; font-size: 12px; width: 100%; display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 0 70px 0 70px;'>
                <div style='display: flex; flex-direction: row; width: 100%; align-items: center'>
                    {title}
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

    private async Task<bool> GetHideAppNameInPdf(
        Instance instance,
        string taskId,
        string language,
        StorageAuthenticationMethod? authenticationMethod
    )
    {
        try
        {
            var hideAppName = _resources.GetGlobalUiSettings()?.HideAppNameInPdf;
            if (hideAppName is null)
                return false;

            var expression = hideAppName.Value;
            if (expression.IsLiteralValue)
                return expression.ValueUnion.Bool;

            // Read the data from Storage, as the PDF generator does
            IInstanceDataAccessor dataAccessor = await _instanceDataUnitOfWorkInitializer.Init(
                instance,
                StorageVersionMetadata.Empty,
                taskId,
                language,
                authenticationMethod
            );
            var state = dataAccessor.GetLayoutEvaluatorState();

            var settings = _resources.GetLayoutSettingsForFolder(taskId);
            DataElementIdentifier? dataElement = settings?.DefaultDataType is { } dataType
                ? instance.Data?.Find(d => d.DataType == dataType)
                : null;

            var componentContext = new ComponentContext(
                dataAccessor,
                component: null,
                rowIndices: null,
                dataElementIdentifier: dataElement
            );
            var result = await ExpressionEvaluator.EvaluateExpression(state, expression, componentContext);
            return result is true;
        }
        catch (Exception e) when (e is JsonException or InvalidOperationException or InvalidCastException)
        {
            _logger.LogWarning(e, "Failed to evaluate hideAppNameInPdf, defaulting to showing app name");
            return false;
        }
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

/// <summary>
/// Contains subform-specific parameters required for generating a subform PDF.
/// </summary>
/// <param name="ComponentId">The ID of the subform component.</param>
/// <param name="DataElementId">The ID of the subform data element.</param>
public sealed record SubformPdfContext(string ComponentId, string DataElementId);
