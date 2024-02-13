using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class ProcessTaskIdChangedApplicationMetadataHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IHubContext<SyncHub, ISyncClient> _hubContext;

    public ProcessTaskIdChangedApplicationMetadataHandler(IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IHubContext<SyncHub, ISyncClient> hubContext)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _hubContext = hubContext;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                notification.EditingContext.Org,
                notification.EditingContext.Repo,
                notification.EditingContext.Developer);

            var applicationMetadata = await repository.GetApplicationMetadata(cancellationToken);

            if (TryChangeTaskIds(applicationMetadata, notification.OldId, notification.NewId))
            {
                await repository.SaveApplicationMetadata(applicationMetadata);
            }
        }
        catch (Exception e)
        {
            SyncError error = new(
                SyncErrorCodes.ApplicationMetadataTaskIdSyncError,
                new ErrorSource(
                    $"{nameof(ApplicationMetadata).ToLower()}.json",
                    "App/config/applicationmetadata.json"
                ),
                e.Message
            );

            await _hubContext.Clients.Group(notification.EditingContext.Developer).FileSyncError(error);
        }
    }

    /// <summary>
    /// Tries to change the task ids in the application metadata.
    /// If there are changes, the application metadata is updated and the method returns true.
    /// Otherwise, the method returns false.
    /// </summary>
    private static bool TryChangeTaskIds(Application applicationMetadata, string oldId, string newId)
    {
        bool hasChanges = false;
        foreach (DataType applicationMetadataDataType in applicationMetadata.DataTypes.Where(x =>
                     x.TaskId == oldId))
        {
            applicationMetadataDataType.TaskId = newId;
            hasChanges = true;
        }

        return hasChanges;
    }
}
