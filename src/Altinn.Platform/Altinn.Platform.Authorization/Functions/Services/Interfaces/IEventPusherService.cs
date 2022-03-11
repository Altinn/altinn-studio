using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Models;

namespace Altinn.Platform.Authorization.Functions.Services.Interfaces
{
    public interface IEventPusherService
    {
        Task PushEvents(DelegationChangeEventList delegationChangeEvents);
    }
}
