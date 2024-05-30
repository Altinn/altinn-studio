namespace Altinn.App.Core.Internal.Sign;

/// <summary>
/// Interface for httpClient to send sign requests to platform
/// </summary>
public interface ISignClient
{
    /// <summary>
    /// Generate a signature for a list of DataElements for a user
    /// </summary>
    /// <param name="signatureContext">The context for the signature <see cref="SignatureContext"/></param>
    /// <returns></returns>
    public Task SignDataElements(SignatureContext signatureContext);
}
