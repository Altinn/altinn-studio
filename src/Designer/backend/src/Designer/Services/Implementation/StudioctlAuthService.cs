using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Distributed;

namespace Altinn.Studio.Designer.Services.Implementation;

public class StudioctlAuthService(IApiKeyService apiKeyService, IDistributedCache cache, TimeProvider timeProvider)
{
    private static readonly TimeSpan _authCodeLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan _pendingRequestLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan _apiKeyLifetime = TimeSpan.FromDays(90);
    private const string AuthCodeCacheKeyPrefix = "studioctl-auth-code:";
    private const string PendingRequestCacheKeyPrefix = "studioctl-auth-request:";

    public async Task<StudioctlAuthResult<string>> CreateAuthorizationRequestAsync(
        string username,
        StudioctlAuthorizeRequest request,
        CancellationToken cancellationToken
    )
    {
        if (!IsLoopbackRedirectUri(request.RedirectUri))
        {
            return BadRequest<string>("redirect_uri must be an http loopback URL.");
        }

        if (string.IsNullOrWhiteSpace(request.State))
        {
            return BadRequest<string>("state is required.");
        }

        if (string.IsNullOrWhiteSpace(request.CodeChallenge))
        {
            return BadRequest<string>("code_challenge is required.");
        }

        string normalizedClientName = NormalizeClientName(request.ClientName);
        DateTimeOffset expiresAt = timeProvider.GetUtcNow().Add(_apiKeyLifetime);
        string requestId = CreateCode();
        var pendingRequest = new StudioctlPendingAuthRequest(
            username,
            normalizedClientName,
            CreateTokenName(normalizedClientName),
            request.RedirectUri,
            request.State,
            request.CodeChallenge,
            expiresAt
        );
        await cache.SetStringAsync(
            PendingRequestCacheKeyPrefix + requestId,
            JsonSerializer.Serialize(pendingRequest),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _pendingRequestLifetime },
            cancellationToken
        );

        return Success(CreateConfirmationUrl(username, requestId));
    }

    public async Task<StudioctlAuthResult<StudioctlAuthRequestResponse>> GetRequestAsync(
        string id,
        string username,
        CancellationToken cancellationToken
    )
    {
        StudioctlPendingAuthRequest? request = await GetPendingRequestAsync(id, cancellationToken);
        if (request is null)
        {
            return NotFound<StudioctlAuthRequestResponse>();
        }

        if (!IsCurrentUser(request, username))
        {
            return Forbidden<StudioctlAuthRequestResponse>();
        }

        return Success(
            new StudioctlAuthRequestResponse(request.Username, request.ClientName, request.TokenName, request.ExpiresAt)
        );
    }

    public async Task<StudioctlAuthResult<StudioctlAuthCallbackResponse>> ConfirmRequestAsync(
        string id,
        string username,
        CancellationToken cancellationToken
    )
    {
        StudioctlPendingAuthRequest? request = await GetPendingRequestAsync(id, cancellationToken);
        if (request is null)
        {
            return NotFound<StudioctlAuthCallbackResponse>();
        }

        if (!IsCurrentUser(request, username))
        {
            return Forbidden<StudioctlAuthCallbackResponse>();
        }

        string code = CreateCode();
        var exchange = new StudioctlAuthCode(
            request.Username,
            request.TokenName,
            request.CodeChallenge,
            request.ExpiresAt
        );
        await cache.SetStringAsync(
            AuthCodeCacheKeyPrefix + code,
            JsonSerializer.Serialize(exchange),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _authCodeLifetime },
            cancellationToken
        );
        await cache.RemoveAsync(PendingRequestCacheKeyPrefix + id, cancellationToken);

        string callbackUri = AddQuery(
            request.RedirectUri,
            new Dictionary<string, string> { ["code"] = code, ["state"] = request.State }
        );

        return Success(new StudioctlAuthCallbackResponse(callbackUri));
    }

    public async Task<StudioctlAuthResult<StudioctlAuthCallbackResponse>> CancelRequestAsync(
        string id,
        string username,
        CancellationToken cancellationToken
    )
    {
        StudioctlPendingAuthRequest? request = await GetPendingRequestAsync(id, cancellationToken);
        if (request is null)
        {
            return NotFound<StudioctlAuthCallbackResponse>();
        }

        if (!IsCurrentUser(request, username))
        {
            return Forbidden<StudioctlAuthCallbackResponse>();
        }

        await cache.RemoveAsync(PendingRequestCacheKeyPrefix + id, cancellationToken);
        string callbackUri = AddQuery(
            request.RedirectUri,
            new Dictionary<string, string> { ["error"] = "access_denied", ["state"] = request.State }
        );

        return Success(new StudioctlAuthCallbackResponse(callbackUri));
    }

    public async Task<StudioctlAuthResult<StudioctlTokenResponse>> ExchangeCodeAsync(
        StudioctlTokenRequest request,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest<StudioctlTokenResponse>("code is required.");
        }

        string cacheKey = AuthCodeCacheKeyPrefix + request.Code;
        string? serializedAuthCode = await cache.GetStringAsync(cacheKey, cancellationToken);
        if (serializedAuthCode is null)
        {
            return Unauthorized<StudioctlTokenResponse>();
        }

        // TODO: IDistributedCache does not expose atomic get-and-delete semantics. The short TTL and PKCE verifier
        // limit replay risk; we should consider replacing these with atomic operations.
        await cache.RemoveAsync(cacheKey, cancellationToken);

        StudioctlAuthCode? authCode = JsonSerializer.Deserialize<StudioctlAuthCode>(serializedAuthCode);
        if (authCode is null)
        {
            return Unauthorized<StudioctlTokenResponse>();
        }

        if (!MatchesCodeChallenge(request.CodeVerifier, authCode.CodeChallenge))
        {
            return Unauthorized<StudioctlTokenResponse>();
        }

        var (rawKey, apiKey) = await apiKeyService.CreateAsync(
            authCode.Username,
            authCode.TokenName,
            ApiKeyType.User,
            authCode.ExpiresAt,
            cancellationToken: cancellationToken
        );

        return Success(new StudioctlTokenResponse(apiKey.Username, rawKey, apiKey.Id, apiKey.ExpiresAt));
    }

    public async Task RevokeApiKeyAsync(long id, string username, CancellationToken cancellationToken)
    {
        await apiKeyService.RevokeAsync(id, username, cancellationToken);
    }

    private async Task<StudioctlPendingAuthRequest?> GetPendingRequestAsync(
        string id,
        CancellationToken cancellationToken
    )
    {
        string? serializedRequest = await cache.GetStringAsync(PendingRequestCacheKeyPrefix + id, cancellationToken);
        return serializedRequest is null
            ? null
            : JsonSerializer.Deserialize<StudioctlPendingAuthRequest>(serializedRequest);
    }

    private static bool IsLoopbackRedirectUri(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? uri))
        {
            return false;
        }

        return uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback;
    }

    private static bool IsCurrentUser(StudioctlPendingAuthRequest request, string username) =>
        string.Equals(request.Username, username, StringComparison.Ordinal);

    private static string NormalizeClientName(string? clientName)
    {
        string prefix = string.IsNullOrWhiteSpace(clientName) ? "studioctl" : clientName.Trim();
        if (prefix.Length > 60)
        {
            prefix = prefix[..60];
        }

        return prefix;
    }

    private static string CreateTokenName(string clientName)
    {
        string suffix = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(6));
        return $"{clientName} {suffix}";
    }

    private static string CreateCode() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static string CreateConfirmationUrl(string username, string requestId) =>
        $"/settings/{WebUtility.UrlEncode(username)}/studioctl-auth?requestId={WebUtility.UrlEncode(requestId)}";

    private static bool MatchesCodeChallenge(string codeVerifier, string codeChallenge)
    {
        if (string.IsNullOrWhiteSpace(codeVerifier) || string.IsNullOrWhiteSpace(codeChallenge))
        {
            return false;
        }

        byte[] challengeBytes = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));
        string computedChallenge = WebEncoders.Base64UrlEncode(challengeBytes);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(computedChallenge),
            Encoding.ASCII.GetBytes(codeChallenge)
        );
    }

    private static string AddQuery(string redirectUri, Dictionary<string, string> query)
    {
        var builder = new UriBuilder(redirectUri);
        var parts = new List<string>();
        if (!string.IsNullOrEmpty(builder.Query))
        {
            parts.Add(builder.Query.TrimStart('?'));
        }

        foreach ((string key, string value) in query)
        {
            parts.Add($"{WebUtility.UrlEncode(key)}={WebUtility.UrlEncode(value)}");
        }

        builder.Query = string.Join("&", parts);
        return builder.Uri.ToString();
    }

    private static StudioctlAuthResult<T> Success<T>(T value) => new(StudioctlAuthStatus.Success, value);

    private static StudioctlAuthResult<T> BadRequest<T>(string message) =>
        new(StudioctlAuthStatus.BadRequest, ErrorMessage: message);

    private static StudioctlAuthResult<T> NotFound<T>() => new(StudioctlAuthStatus.NotFound);

    private static StudioctlAuthResult<T> Forbidden<T>() => new(StudioctlAuthStatus.Forbidden);

    private static StudioctlAuthResult<T> Unauthorized<T>() => new(StudioctlAuthStatus.Unauthorized);

    private record StudioctlPendingAuthRequest(
        string Username,
        string ClientName,
        string TokenName,
        string RedirectUri,
        string State,
        string CodeChallenge,
        DateTimeOffset ExpiresAt
    );

    private record StudioctlAuthCode(string Username, string TokenName, string CodeChallenge, DateTimeOffset ExpiresAt);
}
