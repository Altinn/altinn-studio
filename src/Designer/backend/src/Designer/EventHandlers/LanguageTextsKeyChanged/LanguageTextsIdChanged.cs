using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.EventHandlers.LanguageTextsKeyChanged;

public class LanguageTextsIdChanged(
    IHubContext<SyncHub, ISyncClient> syncHub, ITextsService textsService) : INotificationHandler<LanguageTextsKeyChangedEvent>
{

    public async Task Handle(LanguageTextsKeyChangedEvent notification, CancellationToken cancellationToken)
    {
        List<string> updatedFiles = await textsService.UpdateRelatedFiles(notification.EditingContext.Org, notification.EditingContext.Repo, notification.EditingContext.Developer, notification.IdMutations);
        ISyncClient syncClient = syncHub.Clients.Group(notification.EditingContext.Developer);
        foreach (string updatedFile in updatedFiles)
        {
            SyncSuccess syncSuccess = new(new Source(Path.GetFileName(updatedFile), updatedFile));
            await syncClient.FileSyncSuccess(syncSuccess);
        }
    }
}
