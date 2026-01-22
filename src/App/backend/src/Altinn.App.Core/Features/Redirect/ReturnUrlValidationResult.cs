using System.Diagnostics.CodeAnalysis;

namespace Altinn.App.Core.Features.Redirect;

/// <summary>
/// Result of a redirect URL validation.
/// </summary>
public class ReturnUrlValidationResult
{
    /// <summary>
    /// Indicates whether the URL is valid.
    /// </summary>
    [MemberNotNullWhen(true, nameof(DecodedUrl))]
    [MemberNotNullWhen(false, nameof(ErrorMessage))]
    public bool IsValid { get; init; }

    /// <summary>
    /// The decoded URL if validation succeeded.
    /// </summary>
    public string? DecodedUrl { get; init; }

    /// <summary>
    /// Error message if validation failed.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Indicates whether the error is due to invalid domain (validation problem) vs invalid format (bad request).
    /// </summary>
    public bool IsInvalidDomain { get; init; }

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    /// <param name="decodedUrl">The decoded URL</param>
    /// <returns>A successful result</returns>
    public static ReturnUrlValidationResult Success(string decodedUrl) =>
        new() { IsValid = true, DecodedUrl = decodedUrl };

    /// <summary>
    /// Creates a failure result due to invalid format.
    /// </summary>
    /// <param name="errorMessage">The error message</param>
    /// <returns>A failure result</returns>
    public static ReturnUrlValidationResult InvalidFormat(string errorMessage) =>
        new()
        {
            IsValid = false,
            ErrorMessage = errorMessage,
            IsInvalidDomain = false,
        };

    /// <summary>
    /// Creates a failure result due to invalid domain.
    /// </summary>
    /// <param name="errorMessage">The error message</param>
    /// <returns>A failure result</returns>
    public static ReturnUrlValidationResult InvalidDomain(string errorMessage) =>
        new()
        {
            IsValid = false,
            ErrorMessage = errorMessage,
            IsInvalidDomain = true,
        };
}
