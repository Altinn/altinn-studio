using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.Legacy;

/// <summary>
/// Service task that generates PDFs for all connected data types that have the EnablePdfCreation flag set to true.
/// </summary>
/// <remarks>Planned to be replaced by <see cref="PdfServiceTask"/>, but kept for now for backwards compatibility. Called inline in <see cref="EndTaskEventHandler"/>, instead of through the service task system.</remarks>
internal interface IPdfServiceTaskLegacy
{
    /// <summary>
    /// Executes the service task.
    /// </summary>
    Task Execute(string taskId, Instance instance);
}

/// <inheritdoc />
internal class PdfServiceTaskLegacy : IPdfServiceTaskLegacy
{
    private readonly IAppMetadata _appMetadata;
    private readonly IPdfService _pdfService;

    /// <summary>
    /// Initializes a new instance of the <see cref="PdfServiceTaskLegacy"/> class.
    /// </summary>
    public PdfServiceTaskLegacy(IAppMetadata appMetadata, IPdfService pdfService)
    {
        _pdfService = pdfService;
        _appMetadata = appMetadata;
    }

    /// <inheritdoc />
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
