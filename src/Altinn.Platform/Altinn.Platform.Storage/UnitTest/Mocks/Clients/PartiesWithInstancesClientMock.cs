using System;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Clients;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Clients
{
    public class PartiesWithInstancesClientMock : IPartiesWithInstancesClient
    {
        public async Task SetHasAltinn3Instances(int instanceOwnerPartyId)
        {
            switch (instanceOwnerPartyId)
            {
                case 1337:
                    await Task.CompletedTask;
                    break;
                default:
                    throw new ArgumentException("Unknown instanceOwnerPartyId");
            }
        }
    }
}
