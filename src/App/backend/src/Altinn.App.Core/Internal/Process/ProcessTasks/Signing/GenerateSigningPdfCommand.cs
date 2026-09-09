using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;

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

    public GenerateSigningPdfCommand(IProcessReader processReader, IPdfService pdfService)
    {
        _processReader = processReader;
        _pdfService = pdfService;
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

        await using Stream pdfStream = await _pdfService.GeneratePdf(dataMutator, taskId, false, ct: ct);
        using var memoryStream = new MemoryStream();
        await pdfStream.CopyToAsync(memoryStream, ct);

        dataMutator.AddBinaryDataElement(
            signingPdfDataType,
            PdfContentType,
            signingPdfDataType + ".pdf",
            memoryStream.ToArray(),
            taskId
        );

        return ProcessEngineCommandResult.Completed();
    }
}
