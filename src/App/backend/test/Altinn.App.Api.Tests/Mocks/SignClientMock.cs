using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Sign;

namespace Altinn.App.Api.Tests.Mocks;

public class SignClientMock : ISignClient
{
    public Task SignDataElements(
        SignatureContext signatureContext,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        throw new NotImplementedException();
    }
}
