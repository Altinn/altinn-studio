using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;
using Azure.Storage.Queues.Models;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// The service used to map internal delegation change to delegation change events and push them to the event queue.
    /// </summary>
    public interface IDelegationChangeEventQueue
    {
        /// <summary>
        /// Converts the delegation change to a delegation change event and pushes it to the event queue.
        /// Throws exception if something fails
        /// </summary>
        /// <param name="delegationChange">The delegation change stored in postgresql</param>
        Task<SendReceipt> Push(DelegationChange delegationChange);
    }
}
