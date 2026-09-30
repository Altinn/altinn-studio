#nullable disable
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

/// <summary>
/// Renames the layout set folder when a process task id changes in a v9 app.
/// In v9 a non-subform layout set's folder name equals its process task id and there is no
/// layout-sets.json, so <see cref="ProcessTaskIdChangedLayoutSetsHandler"/> (which syncs that file) is a
/// no-op. This handler is the v9 counterpart: it moves the folder so its name matches the new task id.
/// </summary>
public class ProcessTaskIdChangedUiFoldersHandler : INotificationHandler<ProcessTaskIdChangedEvent>
{
    private readonly IAppVersionService _appVersionService;
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
    private readonly IFileSyncHandlerExecutor _fileSyncHandlerExecutor;

    public ProcessTaskIdChangedUiFoldersHandler(
        IAppVersionService appVersionService,
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IFileSyncHandlerExecutor fileSyncHandlerExecutor
    )
    {
        _appVersionService = appVersionService;
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        _fileSyncHandlerExecutor = fileSyncHandlerExecutor;
    }

    public async Task Handle(ProcessTaskIdChangedEvent notification, CancellationToken cancellationToken)
    {
        // v4/v8 apps sync the task id through layout-sets.json instead (see ProcessTaskIdChangedLayoutSetsHandler).
        if (!_appVersionService.IsV9App(notification.EditingContext))
        {
            return;
        }

        await _fileSyncHandlerExecutor.ExecuteWithExceptionHandlingAndConditionalNotification(
            notification.EditingContext,
            SyncErrorCodes.LayoutSetsTaskIdSyncError,
            $"App/ui/{notification.NewId}",
            () =>
            {
                var repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    notification.EditingContext.Org,
                    notification.EditingContext.Repo,
                    notification.EditingContext.Developer
                );

                // Only rename when a folder still carries the old task id and the new name is free. This keeps
                // the handler idempotent: when the change originates from a layout set folder rename, the folder
                // is already renamed before this event is published, so there is nothing left to do here.
                string[] folderNames = repository.GetLayoutSetNames();
                if (!folderNames.Contains(notification.OldId) || folderNames.Contains(notification.NewId))
                {
                    return Task.FromResult(false);
                }

                repository.ChangeLayoutSetFolderName(notification.OldId, notification.NewId, cancellationToken);
                return Task.FromResult(true);
            }
        );
    }
}
