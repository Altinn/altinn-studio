using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ServiceTasks;

internal interface IPdfServiceTask : IServiceTask { }

/// <summary>
/// Service task that generates PDFs for all connected datatypes that have the EnablePdfCreation flag set to true.
/// </summary>
public class PdfServiceTask : IPdfServiceTask
{
    private readonly IAppMetadata _appMetadata;
    private readonly IPdfService _pdfService;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfServiceTask"/> class.
    /// </summary>
    public PdfServiceTask(IAppMetadata appMetadata, IPdfService pdfService)
    {
        _pdfService = pdfService;
        _appMetadata = appMetadata;
    }

    /// <inheritdoc/>
    public async Task Execute(string taskId, Instance instance)
    {
        ArgumentNullException.ThrowIfNull(taskId);
        ArgumentNullException.ThrowIfNull(instance);

        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        List<DataType> dataTypesWithPdf = appMetadata.DataTypes.FindAll(dt =>
            dt.TaskId == taskId && dt.AppLogic?.ClassRef != null && dt.EnablePdfCreation
        );

        if (
            instance.Data.Exists(dataElement =>
                dataTypesWithPdf.Exists(dataType => dataType.Id == dataElement.DataType)
            )
        )
        {
            await _pdfService.GenerateAndStorePdf(instance, taskId, CancellationToken.None);
        }
    }
}
