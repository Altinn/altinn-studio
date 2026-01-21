namespace Altinn.App.Core.Features.Redirect;

/// <summary>
/// Service for validating redirect URLs.
/// </summary>
public interface IRedirectUrlValidator
{
    /// <summary>
    /// Validates and decodes a base64-encoded redirect URL.
    /// </summary>
    /// <param name="base64Url">Base64-encoded URL string</param>
    /// <returns>Validation result with decoded URL or error</returns>
    RedirectUrlValidationResult Validate(string? base64Url);
}
