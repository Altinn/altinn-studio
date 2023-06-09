using System.Threading;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Service that provides semaphores for user requests, to control the number of parallel requests per user.
    /// </summary>
    public interface IUserRequestsSynchronizationService
    {
        SemaphoreSlim GetRequestsSemaphore(string org, string repo, string developer);
    }
}
