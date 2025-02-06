namespace Altinn.App.Core.Features.Auth;

/// <summary>
/// Exception thrown when there is an issue with parsing the current authentication info.
/// </summary>
public class AuthenticationContextException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="AuthenticationContextException"/> class.
    /// </summary>
    /// <param name="message"></param>
    public AuthenticationContextException(string message)
        : base(message) { }
}
