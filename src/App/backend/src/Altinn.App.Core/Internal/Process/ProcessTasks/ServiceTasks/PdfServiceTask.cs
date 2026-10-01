using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
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
    private readonly ILogger<PdfServiceTask> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfServiceTask"/> class.
    /// </summary>
    public PdfServiceTask(
        IPdfService pdfService,
        IPdfFileNameResolver pdfFileNameResolver,
        IProcessReader processReader,
        ILogger<PdfServiceTask> logger
    )
    {
        _pdfService = pdfService;
        _pdfFileNameResolver = pdfFileNameResolver;
        _processReader = processReader;
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

        await using Stream pdf = await _pdfService.GeneratePdf(
            dataMutator.Instance,
            taskId,
            config.AutoPdfTaskIds,
            authenticationMethod: StorageAuthenticationMethod.ServiceOwner(),
            cancellationToken: context.CancellationToken
        );
        string fileName = await _pdfFileNameResolver.GetFileName(dataMutator, config.FilenameTextResourceKey);
        using var pdfBytes = new MemoryStream();
        await pdf.CopyToAsync(pdfBytes, context.CancellationToken);

        // Generated from the task, so the PDF is removed if the task starts again
        dataMutator.AddBinaryDataElement(
            PdfService.PdfElementType,
            PdfService.PdfContentType,
            fileName,
            pdfBytes.ToArray(),
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
}
