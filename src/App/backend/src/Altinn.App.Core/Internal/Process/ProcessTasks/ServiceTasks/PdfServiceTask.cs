using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

internal interface IPdfServiceTask : IServiceTask { }

/// <summary>
/// Service task that generates PDFs for tasks specified in the process configuration.
/// </summary>
internal sealed class PdfServiceTask : IPdfServiceTask
{
    private readonly IPdfService _pdfService;
    private readonly IProcessReader _processReader;
    private readonly ILogger<PdfServiceTask> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfServiceTask"/> class.
    /// </summary>
    public PdfServiceTask(IPdfService pdfService, IProcessReader processReader, ILogger<PdfServiceTask> logger)
    {
        _pdfService = pdfService;
        _processReader = processReader;
        _logger = logger;
    }

    /// <inheritdoc />
    public string Type => "pdf";

    /// <inheritdoc/>
    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        string taskId = context.InstanceDataMutator.Instance.Process.CurrentTask.ElementId;
        Instance instance = context.InstanceDataMutator.Instance;

        _logger.LogDebug("Calling PdfService for PDF Service Task {TaskId}.", LogSanitizer.Sanitize(taskId));

        ValidAltinnPdfConfiguration config = GetValidAltinnPdfConfiguration(taskId);
        _ = await _pdfService.GenerateAndStorePdf(
            instance,
            taskId,
            config.FilenameTextResourceKey,
            config.AutoPdfTaskIds,
            context.CancellationToken
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
}
