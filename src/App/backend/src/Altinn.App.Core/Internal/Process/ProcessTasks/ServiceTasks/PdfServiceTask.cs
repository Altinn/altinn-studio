using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

internal interface IPdfServiceTask : IServiceTask { }

/// <summary>
/// Service task that generates PDFs for tasks specified in the process configuration.
/// </summary>
internal sealed class PdfServiceTask : IPdfServiceTask
{
    private readonly IPdfService _pdfService;
    private readonly IPdfFileNameResolver _pdfFileNameResolver;
    private readonly IProcessReader _processReader;
    private readonly IAppResources _appResources;
    private readonly ILogger<PdfServiceTask> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfServiceTask"/> class.
    /// </summary>
    public PdfServiceTask(
        IPdfService pdfService,
        IPdfFileNameResolver pdfFileNameResolver,
        IProcessReader processReader,
        IAppResources appResources,
        ILogger<PdfServiceTask> logger
    )
    {
        _pdfService = pdfService;
        _pdfFileNameResolver = pdfFileNameResolver;
        _processReader = processReader;
        _appResources = appResources;
        _logger = logger;
    }

    /// <inheritdoc />
    public string Type => "pdf";

    /// <inheritdoc/>
    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process.CurrentTask.ElementId;

        _logger.LogDebug("Calling PdfService for PDF Service Task {TaskId}.", LogSanitizer.Sanitize(taskId));

        ValidAltinnPdfConfiguration config = GetValidAltinnPdfConfiguration(taskId);

        // A render the frontend rejects surfaces only as a PDF generator timeout, which the engine retries
        // until the workflow gives up. Fail at once with the actual reason instead. The analyzer reports the
        // same at build time (ALTINNAPP1000 and ALTINNAPP1001).
        if (GetUnrenderableConfigurationReason(taskId, config.AutoPdfTaskIds) is { } reason)
        {
            return ServiceTaskResult.FailedPermanent(reason);
        }

        // The actor's language, since a workflow callback is authenticated as the app, whose language is nb
        byte[] pdf = await _pdfService.GeneratePdf(
            dataMutator.Instance,
            taskId,
            config.AutoPdfTaskIds,
            dataMutator.Language,
            authenticationMethod: StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken: context.CancellationToken
        );
        string fileName = await _pdfFileNameResolver.GetFileName(dataMutator, config.FilenameTextResourceKey);

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
    /// Why the frontend cannot render the PDF for this task, or null when it can. The frontend renders a PDF
    /// service task from its own UI folder when it has one (using its <c>pdfLayoutName</c> when set), and
    /// otherwise from the tasks passed as <c>task</c> query parameters, which come from
    /// <c>autoPdfTaskIds</c>.
    /// </summary>
    private string? GetUnrenderableConfigurationReason(string taskId, List<string>? autoPdfTaskIds)
    {
        bool listsTasks = autoPdfTaskIds?.Exists(id => !string.IsNullOrWhiteSpace(id)) is true;
        LayoutSettings? ownUiFolderSettings = _appResources.GetLayoutSettingsForFolder(taskId);

        if (ownUiFolderSettings is null)
        {
            return listsTasks
                ? null
                : $"PDF service task '{taskId}' has nothing to render. List the tasks to include in "
                    + $"<altinn:pdfConfig><altinn:autoPdfTaskIds>, or add a UI folder 'ui/{taskId}' with a "
                    + "Settings.json to design the PDF yourself.";
        }

        if (listsTasks && string.IsNullOrWhiteSpace(ownUiFolderSettings.Pages?.PdfLayoutName))
        {
            return $"PDF service task '{taskId}' lists tasks in <altinn:autoPdfTaskIds> and also has its own UI "
                + $"folder 'ui/{taskId}' without a pdfLayoutName, which cannot be rendered. Remove "
                + $"<altinn:autoPdfTaskIds> or the UI folder, or set pdfLayoutName in 'ui/{taskId}/Settings.json' "
                + "to render a custom PDF layout.";
        }

        return null;
    }
}
