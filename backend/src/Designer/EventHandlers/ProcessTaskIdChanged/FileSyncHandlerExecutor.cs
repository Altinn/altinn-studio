using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.SyncHub;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;

public class FileSyncHandlerExecutor : IFileSyncHandlerExecutor
{
    private readonly IHubContext<SyncHub, ISyncClient> _hubContext;

    public FileSyncHandlerExecutor(IHubContext<SyncHub, ISyncClient> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task ExecuteWithExceptionHandling(AltinnRepoEditingContext editingContext, string errorCode, string sourcePath, Func<Task> method)
    {
        try
        {
            await method();
        }
        catch (Exception e)
        {
            SyncError error = new(
                errorCode,
                new ErrorSource(
                    Path.GetFileName(sourcePath),
                    sourcePath
                ),
                e.Message
            );

            await _hubContext.Clients.Group(editingContext.Developer).FileSyncError(error);
        }
    }

    public Task ExecuteWithExceptionHandling(
        (AltinnRepoEditingContext editingContext, string errorCode, string sourcePath, Func<Task> method) missing_name) =>
        throw new NotImplementedException();
}
