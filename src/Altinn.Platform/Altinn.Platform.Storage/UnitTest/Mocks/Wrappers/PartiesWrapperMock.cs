using System.Threading.Tasks;
using Altinn.Platform.Storage.Wrappers;

namespace Altinn.Platform.Storage.UnitTest.Mocks.Wrappers
{
    public class PartiesWrapperMock : IParties
    {
        public Task SetHasAltinn3Instances(int instanceOwnerPartyId)
        {
            throw new System.NotImplementedException();
        }
    }
}
