using System.Threading;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IUserRequestsSynchronizationService
    {
        SemaphoreSlim GetRequestsSemaphore(string org, string repo, string developer);
    }
}
