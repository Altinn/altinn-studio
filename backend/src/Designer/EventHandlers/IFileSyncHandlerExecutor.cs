using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.EventHandlers;

public interface IFileSyncHandlerExecutor
{
    Task ExecuteWithExceptionHandling(AltinnRepoEditingContext editingContext, string errorCode, string sourcePath,
        Func<Task> handlerFunction);
}
