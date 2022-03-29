using System;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Models.DelegationChangeEvent;
using Altinn.Platform.Authorization.Services.Interface;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    /// <inheritdoc />
    public class DelegationChangeEventQueueMock : IDelegationChangeEventQueue
    {
        /// <summary>
        /// Mocks pushing delegation changes to the event queue
        /// </summary>
        /// <param name="delegationChange">The delegation change stored in postgresql</param>
        public Task Push(DelegationChange delegationChange)
        {
            if (string.IsNullOrEmpty(delegationChange.AltinnAppId) || delegationChange.AltinnAppId == "error/delegationeventfail")
            {
                throw new Exception("DelegationChangeEventQueue || Push || Error");
            }

            return Task.CompletedTask;
        }
    }
}
