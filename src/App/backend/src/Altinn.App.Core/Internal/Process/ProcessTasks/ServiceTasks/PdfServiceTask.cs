using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Texts;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

internal interface IPdfServiceTask : IServiceTask { }

/// <summary>
/// Service task that generates PDFs for tasks specified in the process configuration.
/// </summary>
internal sealed class PdfServiceTask : IPdfServiceTask
{
    private readonly IPdfService _pdfService;
    private readonly ITranslationService _translationService;
    private readonly IProcessReader _processReader;
    private readonly IAppResources _appResources;
    private readonly ILogger<PdfServiceTask> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfServiceTask"/> class.
    /// </summary>
    public PdfServiceTask(
        IPdfService pdfService,
        ITranslationService translationService,
        IProcessReader processReader,
        IAppResources appResources,
        ILogger<PdfServiceTask> logger
    )
    {
        _pdfService = pdfService;
        _translationService = translationService;
        _processReader = processReader;
        _appResources = appResources;
        _logger = logger;
    }

    /// <inheritdoc />
    public string Type => "pdf";

    public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Finally(Execute);

    /// <inheritdoc />
    public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)
    {
        // Checked at startup, since at run time a PDF that cannot render only shows up as PDF generator timeouts
        ValidAltinnPdfConfiguration config = GetValidAltinnPdfConfiguration(context.TaskId);
        string? reason = GetUnrenderableConfigurationReason(context.TaskId, config.AutoPdfTaskIds);
        if (reason is null)
        {
            return [];
        }

        return [reason];
    }

    /// <inheritdoc/>
    public async Task<ServiceTaskResult> Execute(StageContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process.CurrentTask.ElementId;

        _logger.LogDebug("Calling PdfService for PDF Service Task {TaskId}.", LogSanitizer.Sanitize(taskId));

        ValidAltinnPdfConfiguration config = GetValidAltinnPdfConfiguration(taskId);

        // The actor's language, the one the user chose for the transition, or nb if it has none
        byte[] pdf = await _pdfService.GeneratePdf(
            dataMutator.Instance,
            taskId,
            dataMutator.Language ?? LanguageConst.Nb,
            config.AutoPdfTaskIds,
            authenticationMethod: StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken: context.CancellationToken
        );
        string fileName = await PdfFileNameResolver.GetFileName(
            _translationService,
            dataMutator,
            config.FilenameTextResourceKey
        );

        // Generated from the task, so the PDF is removed if the task starts again
        dataMutator.AddBinaryDataElement(
            PdfService.PdfElementType,
            PdfService.PdfContentType,
            fileName,
            pdf,
            generatedFromTask: taskId
        );

        _logger.LogDebug(
            "Successfully called PdfService for PDF Service Task {TaskId}.",
            LogSanitizer.Sanitize(taskId)
        );

        return ServiceTaskResult.Success();
    }

    private ValidAltinnPdfConfiguration GetValidAltinnPdfConfiguration(string taskId)
    {
        AltinnTaskExtension? altinnTaskExtension = _processReader.GetAltinnTaskExtension(taskId);
        AltinnPdfConfiguration? pdfConfiguration = altinnTaskExtension?.PdfConfiguration;

        if (pdfConfiguration == null)
        {
            // If no PDF configuration is specified, return a default valid configuration. No required config as of now.
            return new ValidAltinnPdfConfiguration();
        }

        return pdfConfiguration.Validate();
    }

    /// <summary>
    /// Why the frontend cannot render the PDF for this PDF service task, or null when it can. The frontend renders
    /// the layout that <c>pdfLayoutName</c> in the task's own UI folder names, and otherwise the tasks passed as
    /// <c>task</c> query parameters, which come from <c>autoPdfTaskIds</c>.
    /// </summary>
    private string? GetUnrenderableConfigurationReason(string taskId, List<string>? autoPdfTaskIds)
    {
        string? pdfLayoutName = _appResources.GetLayoutSettingsForFolder(taskId)?.Pages?.PdfLayoutName;
        if (!string.IsNullOrWhiteSpace(pdfLayoutName))
        {
            return HasLayout(_appResources, taskId, pdfLayoutName)
                ? null
                : $"PDF service task '{taskId}' sets pdfLayoutName '{pdfLayoutName}' in 'ui/{taskId}/Settings.json', "
                    + $"but there is no layout 'ui/{taskId}/layouts/{pdfLayoutName}.json'. Correct pdfLayoutName, or "
                    + "add the layout.";
        }

        if (autoPdfTaskIds?.Exists(id => !string.IsNullOrWhiteSpace(id)) is true)
        {
            return null;
        }

        return $"PDF service task '{taskId}' has nothing to render. List the tasks to include in "
            + $"<altinn:pdfConfig><altinn:autoPdfTaskIds>, or set pdfLayoutName in 'ui/{taskId}/Settings.json' to "
            + "design the PDF yourself.";
    }

    /// <summary>
    /// Whether the UI folder has the layout, which the frontend looks up by its exact name. An
    /// <see cref="IAppResources"/> that returns no layouts at all is not second-guessed.
    /// </summary>
    private static bool HasLayout(IAppResources appResources, string folder, string page)
    {
        if (appResources.GetLayoutsInFolder(folder) is not { } layoutsJson)
        {
            return true;
        }

        using JsonDocument layouts = JsonDocument.Parse(layoutsJson);
        return layouts.RootElement.ValueKind != JsonValueKind.Object || layouts.RootElement.TryGetProperty(page, out _);
    }
}
