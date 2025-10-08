using Altinn.App.Core.Exceptions;

namespace Altinn.App.Core.Features.Signing.Exceptions;

internal class SigningException : AltinnException
{
    public SigningException(string message)
        : base(message) { }
}
