using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessDefinitionSaved;

/// <summary>
/// Ensures every pdf data type the saved process declares (<c>signingPdfDataType</c>,
/// <c>paymentReceiptPdfDataType</c>) exists in the application metadata and accepts
/// <c>application/pdf</c>. Additive only: nothing is removed or rewritten.
/// </summary>
public class ProcessDefinitionSavedPdfDataTypesHandler : INotificationHandler<ProcessDefinitionSavedEvent>
{
    private const string PdfContentType = "application/pdf";
    private const string AppOwnedContributor = "app:owned";

    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessDefinitionSavedPdfDataTypesHandler(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor
    )
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessDefinitionSavedEvent notification, CancellationToken cancellationToken)
    {
        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.ApplicationMetadataDataTypeSyncError,
            "App/config/applicationmetadata.json",
            async () =>
            {
                AltinnAppGitRepository repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );

                List<(string DataTypeId, string TaskId)> declarations = DeclaredPdfDataTypes(
                        repository.GetProcessDefinitions()
                    )
                    .ToList();
                if (declarations.Count == 0)
                {
                    return false;
                }

                ApplicationMetadata applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);
                bool hasChanges = false;
                foreach ((string dataTypeId, string taskId) in declarations)
                {
                    hasChanges |= TryRepairPdfDataType(applicationMetadata, dataTypeId, taskId);
                }

                if (hasChanges)
                {
                    await repository.SaveApplicationMetadata(applicationMetadata);
                }

                return hasChanges;
            }
        );
    }

    private static IEnumerable<(string DataTypeId, string TaskId)> DeclaredPdfDataTypes(Definitions definitions)
    {
        foreach (ProcessTask task in definitions.Process?.AllTasks() ?? [])
        {
            AltinnTaskExtension? taskExtension = task.ExtensionElements?.TaskExtension;

            string? signingPdfDataType = taskExtension?.SignatureConfiguration?.SigningPdfDataType;
            if (!string.IsNullOrWhiteSpace(signingPdfDataType))
            {
                yield return (signingPdfDataType, task.Id);
            }

            string? paymentReceiptPdfDataType = taskExtension?.PaymentConfiguration?.PaymentReceiptPdfDataType;
            if (!string.IsNullOrWhiteSpace(paymentReceiptPdfDataType))
            {
                yield return (paymentReceiptPdfDataType, task.Id);
            }
        }
    }

    private static bool TryRepairPdfDataType(Application applicationMetadata, string dataTypeId, string taskId)
    {
        DataType? registered = applicationMetadata.DataTypes.Find(dataType => dataType.Id == dataTypeId);
        if (registered is null)
        {
            applicationMetadata.DataTypes.Add(
                new DataType
                {
                    Id = dataTypeId,
                    AllowedContentTypes = [PdfContentType],
                    AllowedContributors = [AppOwnedContributor],
                    MaxCount = 1,
                    TaskId = taskId,
                }
            );
            return true;
        }

        // A null or empty allowedContentTypes means the data type accepts anything; adding pdf there would narrow it.
        if (
            registered.AllowedContentTypes is not { Count: > 0 }
            || registered.AllowedContentTypes.Contains(PdfContentType)
        )
        {
            return false;
        }

        registered.AllowedContentTypes.Add(PdfContentType);
        return true;
    }
}
