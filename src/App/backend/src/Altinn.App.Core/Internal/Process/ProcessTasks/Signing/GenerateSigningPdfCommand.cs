using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Generates the signing PDF of a signing task whose configuration names a signing PDF data type. Declared by
/// the signing task for its end phase.
/// </summary>
internal sealed class GenerateSigningPdfCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
{
    private const string PdfContentType = "application/pdf";

    public static string Key => "GenerateSigningPdf";

    private readonly IProcessReader _processReader;
    private readonly IPdfService _pdfService;
    private readonly IInstanceClient _instanceClient;

    public GenerateSigningPdfCommand(
        IProcessReader processReader,
        IPdfService pdfService,
        IInstanceClient instanceClient
    )
    {
        _processReader = processReader;
        _pdfService = pdfService;
        _instanceClient = instanceClient;
    }

    /// <inheritdoc/>
    public override string GetKey() => Key;

    /// <inheritdoc/>
    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessTaskPayload payload
    )
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;
        string taskId = payload.TaskId;
        AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, taskId);

        string? signingPdfDataType = configuration.SigningPdfDataType;
        if (signingPdfDataType is null)
        {
            return ProcessEngineCommandResult.Completed();
        }

        // A previous attempt may have committed the PDF before its callback response was lost.
        // Refresh only its metadata, preserving the workflow's virtual process state and other data.
        Instance stored = await _instanceClient.GetInstance(
            dataMutator.Instance,
            StorageAuthenticationMethod.ServiceOwner(),
            ct
        );
        DataElement[] currentSigningPdfs = (stored.Data ?? [])
            .Where(element => element.DataType == signingPdfDataType)
            .ToArray();
        List<DataElement> instanceData = dataMutator.Instance.Data ??= [];
        instanceData.RemoveAll(element => element.DataType == signingPdfDataType);
        instanceData.AddRange(currentSigningPdfs);

        await using Stream pdfStream = await _pdfService.GeneratePdf(dataMutator, taskId, false, ct: ct);
        using var memoryStream = new MemoryStream();
        await pdfStream.CopyToAsync(memoryStream, ct);

        TaskGeneratedDataElements.UpsertBinaryDataElement(
            dataMutator,
            signingPdfDataType,
            PdfContentType,
            signingPdfDataType + ".pdf",
            memoryStream.ToArray(),
            taskId
        );

        return ProcessEngineCommandResult.Completed();
    }
}
