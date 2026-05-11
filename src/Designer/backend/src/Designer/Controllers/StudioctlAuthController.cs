using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.ApiKeyAuth;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[FeatureGate(StudioFeatureFlags.StudioOidc)]
[Route("designer/api/v1/studioctl/auth")]
public class StudioctlAuthController(IApiKeyService apiKeyService, IDistributedCache cache, TimeProvider timeProvider)
    : ControllerBase
{
    private static readonly TimeSpan _authCodeLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan _apiKeyLifetime = TimeSpan.FromDays(90);
    private const string CacheKeyPrefix = "studioctl-auth-code:";

    [Authorize]
    [HttpGet("authorize")]
    public async Task<IActionResult> Authorize(
        [FromQuery(Name = "redirect_uri")] string redirectUri,
        [FromQuery] string state,
        [FromQuery(Name = "code_challenge")] string codeChallenge,
        [FromQuery(Name = "client_name")] string? clientName,
        CancellationToken cancellationToken
    )
    {
        if (!IsLoopbackRedirectUri(redirectUri))
        {
            return BadRequest("redirect_uri must be an http loopback URL.");
        }

        if (string.IsNullOrWhiteSpace(state))
        {
            return BadRequest("state is required.");
        }

        if (string.IsNullOrWhiteSpace(codeChallenge))
        {
            return BadRequest("code_challenge is required.");
        }

        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string tokenName = CreateTokenName(clientName);
        string code = CreateCode();
        var exchange = new StudioctlAuthCode(username, tokenName, codeChallenge);
        await cache.SetStringAsync(
            CacheKeyPrefix + code,
            JsonSerializer.Serialize(exchange),
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _authCodeLifetime },
            cancellationToken
        );

        string callbackUri = AddQuery(
            redirectUri,
            new Dictionary<string, string> { ["code"] = code, ["state"] = state }
        );

        return Redirect(callbackUri);
    }

    [AllowAnonymous]
    [HttpPost("token")]
    public async Task<ActionResult<StudioctlTokenResponse>> Token(
        [FromBody] StudioctlTokenRequest request,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest("code is required.");
        }

        string cacheKey = CacheKeyPrefix + request.Code;
        string? serializedAuthCode = await cache.GetStringAsync(cacheKey, cancellationToken);
        if (serializedAuthCode is null)
        {
            return Unauthorized();
        }

        await cache.RemoveAsync(cacheKey, cancellationToken);

        StudioctlAuthCode? authCode = JsonSerializer.Deserialize<StudioctlAuthCode>(serializedAuthCode);
        if (authCode is null)
        {
            return Unauthorized();
        }

        if (!MatchesCodeChallenge(request.CodeVerifier, authCode.CodeChallenge))
        {
            return Unauthorized();
        }

        DateTimeOffset expiresAt = timeProvider.GetUtcNow().Add(_apiKeyLifetime);
        var (rawKey, apiKey) = await apiKeyService.CreateAsync(
            authCode.Username,
            authCode.TokenName,
            ApiKeyType.User,
            expiresAt,
            cancellationToken: cancellationToken
        );

        return new StudioctlTokenResponse(apiKey.Username, rawKey, apiKey.Id, apiKey.ExpiresAt);
    }

    [Authorize]
    [AllowApiKey]
    [HttpDelete("api-key/{id:long}")]
    public async Task<IActionResult> RevokeApiKey(long id, CancellationToken cancellationToken)
    {
        string username = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        await apiKeyService.RevokeAsync(id, username, cancellationToken);
        return NoContent();
    }

    private static bool IsLoopbackRedirectUri(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? uri))
        {
            return false;
        }

        return uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback;
    }

    private static string CreateTokenName(string? clientName)
    {
        string prefix = string.IsNullOrWhiteSpace(clientName) ? "studioctl" : clientName.Trim();
        if (prefix.Length > 60)
        {
            prefix = prefix[..60];
        }

        string suffix = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(6));
        return $"{prefix} {suffix}";
    }

    private static string CreateCode() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private static bool MatchesCodeChallenge(string codeVerifier, string codeChallenge)
    {
        if (string.IsNullOrWhiteSpace(codeVerifier) || string.IsNullOrWhiteSpace(codeChallenge))
        {
            return false;
        }

        byte[] challengeBytes = SHA256.HashData(System.Text.Encoding.ASCII.GetBytes(codeVerifier));
        string computedChallenge = WebEncoders.Base64UrlEncode(challengeBytes);
        return CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.ASCII.GetBytes(computedChallenge),
            System.Text.Encoding.ASCII.GetBytes(codeChallenge)
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

    private record StudioctlAuthCode(string Username, string TokenName, string CodeChallenge);

    public record StudioctlTokenRequest(string Code, string CodeVerifier);

    public record StudioctlTokenResponse(string Username, string Key, long KeyId, DateTimeOffset ExpiresAt);
}
