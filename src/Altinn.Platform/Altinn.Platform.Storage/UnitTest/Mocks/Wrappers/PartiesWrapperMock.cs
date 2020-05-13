using System;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Wrappers;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Wrappers
{
    public class PartiesWrapperMock : IParties
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
