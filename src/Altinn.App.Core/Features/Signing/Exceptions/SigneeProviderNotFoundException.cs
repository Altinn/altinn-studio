using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Signing.Exceptions;

internal class SigneeProviderNotFoundException : AltinnException
{
    public SigneeProviderNotFoundException(string message)
        : base(message) { }
}
