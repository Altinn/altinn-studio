using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;

/// <summary>
/// Generates a PDF of each subform data element and adds it to the instance. PDFs from an earlier visit to the task
/// are removed when the task starts, not here.
/// </summary>
internal sealed class SubformPdfServiceTask(
    IProcessReader processReader,
    IPdfService pdfService,
    IPdfFileNameResolver pdfFileNameResolver,
    ILogger<SubformPdfServiceTask> logger
) : IServiceTask
{
    public string Type => "subformPdf";

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process.CurrentTask.ElementId;
        Instance instance = dataMutator.Instance;

        logger.LogDebug("Calling PdfService for Subform PDF Service Task {TaskId}.", taskId);

        ValidAltinnSubformPdfConfiguration config = GetValidAltinnSubformPdfConfiguration(taskId);

        string? filenameTextResourceKey = config.FilenameTextResourceKey;
        string subformComponentId = config.SubformComponentId;
        string subformDataTypeId = config.SubformDataTypeId;

        List<DataElement> subformDataElements = instance.Data.Where(x => x.DataType == subformDataTypeId).ToList();

        // Generate PDFs sequentially
        foreach (DataElement dataElement in subformDataElements)
        {
            logger.LogDebug(
                "Starting PDF generation for subform data element {DataElementId} in task {TaskId}",
                dataElement.Id,
                taskId
            );

            var subformPdfContext = new SubformPdfContext(subformComponentId, dataElement.Id);
            await using Stream pdf = await pdfService.GenerateSubformPdf(
                dataMutator,
                taskId,
                subformPdfContext,
                StorageAuthenticationMethod.ServiceOwner(),
                context.CancellationToken
            );
            string fileName = await pdfFileNameResolver.GetFileName(
                dataMutator,
                filenameTextResourceKey,
                subformPdfContext
            );
            using var pdfBytes = new MemoryStream();
            await pdf.CopyToAsync(pdfBytes, context.CancellationToken);

            // Generated from the task, so the PDF is removed if the task starts again, and says which subform it
            // was made from
            dataMutator.AddBinaryDataElement(
                PdfService.PdfElementType,
                PdfService.PdfContentType,
                fileName,
                pdfBytes.ToArray(),
                generatedFromTask: taskId,
                metadata:
                [
                    new() { Key = "subformComponentId", Value = subformComponentId },
                    new() { Key = "subformDataElementId", Value = dataElement.Id },
                ]
            );

            logger.LogDebug(
                "Completed PDF generation for subform data element {DataElementId} in task {TaskId}",
                dataElement.Id,
                taskId
            );
        }

        logger.LogDebug("Successfully called PdfService for Subform PDF Service Task {TaskId}.", taskId);

        return new ServiceTaskSuccessResult();
    }

    private ValidAltinnSubformPdfConfiguration GetValidAltinnSubformPdfConfiguration(string taskId)
    {
        AltinnTaskExtension? altinnTaskExtension = processReader.GetAltinnTaskExtension(taskId);
        AltinnSubformPdfConfiguration? subformPdfConfiguration = altinnTaskExtension?.SubformPdfConfiguration;

        if (subformPdfConfiguration == null)
        {
            throw new ApplicationConfigException(
                "The subformPdfConfig node is missing in the subform pdf process task configuration."
            );
        }

        return subformPdfConfiguration.Validate();
    }
}
