using Altinn.App.Core.Internal.Sign;

namespace Altinn.App.Api.Tests.Mocks;

public class SignClientMock : ISignClient
{
    public Task SignDataElements(SignatureContext signatureContext)
    {
        throw new NotImplementedException();
    }
}
