using System;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Interface;
using Azure.Storage.Queues.Models;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    /// <inheritdoc />
    public class DelegationChangeEventQueueMock : IDelegationChangeEventQueue
    {
        /// <summary>
        /// Mocks pushing delegation changes to the event queue
        /// </summary>
        /// <param name="delegationChange">The delegation change stored in postgresql</param>
        public Task<SendReceipt> Push(DelegationChange delegationChange)
        {
            if (string.IsNullOrEmpty(delegationChange.AltinnAppId) || delegationChange.AltinnAppId == "error/delegationeventfail")
            {
                throw new Exception("DelegationChangeEventQueue || Push || Error");
            }

            return Task.FromResult((SendReceipt)null);
        }
    }
}
