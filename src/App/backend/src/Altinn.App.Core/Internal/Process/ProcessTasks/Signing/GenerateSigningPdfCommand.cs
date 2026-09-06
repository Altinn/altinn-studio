using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Generates the signing PDF of a signing task whose configuration names a signing PDF data type. Declared by
/// the signing task for its end phase.
/// </summary>
internal sealed class GenerateSigningPdfCommand : IProcessTaskCommand
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
    string IProcessTaskCommand.Key => Key;

    /// <inheritdoc/>
    public async Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
    {
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        CancellationToken ct = context.CancellationToken;
        string taskId = context.TaskId;
        AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, taskId);

        string? signingPdfDataType = configuration.SigningPdfDataType;
        if (signingPdfDataType is null)
        {
            return ProcessTaskCommandResult.Completed();
        }

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

        return ProcessTaskCommandResult.Completed();
    }
}
