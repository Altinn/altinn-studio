using System;

namespace Altinn.Studio.Designer.Services.Models;

public enum StudioctlAuthStatus
{
    Success,
    BadRequest,
    NotFound,
    Forbidden,
    Unauthorized,
}

public record StudioctlAuthResult<T>(StudioctlAuthStatus Status, T? Value = default, string? ErrorMessage = null);

public record StudioctlAuthorizeRequest(string RedirectUri, string State, string CodeChallenge, string? ClientName);

public record StudioctlAuthRequestResponse(
    string Username,
    string ClientName,
    string TokenName,
    DateTimeOffset ExpiresAt
);

public record StudioctlAuthCallbackResponse(string CallbackUrl);

public record StudioctlTokenRequest(string Code, string CodeVerifier);

public record StudioctlTokenResponse(string Username, string Key, long KeyId, DateTimeOffset ExpiresAt);
