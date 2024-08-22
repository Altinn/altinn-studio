using System.Text.Json;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Features.Maskinporten;

/// <inheritdoc/>
public sealed class MaskinportenClient : IMaskinportenClient
{
    /// <summary>
    /// The margin to take into consideration when determining if a token has expired (seconds).
    /// <remarks>This value represents the worst-case latency scenario for <em>outbound</em> connections carrying the access token.</remarks>
    /// </summary>
    internal const int TokenExpirationMargin = 30;

    private const string CacheKeySalt = "maskinportenScope-";
    private static readonly HybridCacheEntryOptions _defaultCacheExpiration = CacheExpiry(TimeSpan.FromSeconds(60));
    private readonly ILogger<MaskinportenClient> _logger;
    private readonly IOptionsMonitor<MaskinportenSettings> _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TimeProvider _timeprovider;
    private readonly HybridCache _tokenCache;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Instantiates a new <see cref="MaskinportenClient"/> object.
    /// </summary>
    /// <param name="options">Maskinporten settings.</param>
    /// <param name="httpClientFactory">HttpClient factory.</param>
    /// <param name="tokenCache">Token cache store.</param>
    /// <param name="logger">Logger interface.</param>
    /// <param name="timeProvider">Optional TimeProvider implementation.</param>
    /// <param name="telemetry">Optional telemetry service.</param>
    public MaskinportenClient(
        IOptionsMonitor<MaskinportenSettings> options,
        IHttpClientFactory httpClientFactory,
        HybridCache tokenCache,
        ILogger<MaskinportenClient> logger,
        TimeProvider? timeProvider = null,
        Telemetry? telemetry = null
    )
    {
        _options = options;
        _telemetry = telemetry;
        _timeprovider = timeProvider ?? TimeProvider.System;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _tokenCache = tokenCache;
    }

    /// <inheritdoc/>
    public async Task<MaskinportenTokenResponse> GetAccessToken(
        IEnumerable<string> scopes,
        CancellationToken cancellationToken = default
    )
    {
        string formattedScopes = FormattedScopes(scopes);
        string cacheKey = $"{CacheKeySalt}_{formattedScopes}";
        DateTimeOffset referenceTime = _timeprovider.GetUtcNow();

        _telemetry?.StartGetAccessTokenActivity(_options.CurrentValue.ClientId, formattedScopes);

        var result = await _tokenCache.GetOrCreateAsync(
            cacheKey,
            async cancel =>
            {
                // Fetch token
                var token = await HandleMaskinportenAuthentication(formattedScopes, cancel);
                var now = _timeprovider.GetUtcNow();
                var cacheExpiry = referenceTime.AddSeconds(token.ExpiresIn - TokenExpirationMargin);
                if (cacheExpiry <= now)
                {
                    throw new MaskinportenTokenExpiredException(
                        $"Access token cannot be used because it has a calculated expiration in the past (taking into account a margin of {TokenExpirationMargin} seconds): {token}"
                    );
                }

                // Wrap and return
                return new TokenCacheEntry(
                    Token: token,
                    Expiration: cacheExpiry - referenceTime,
                    HasSetExpiration: false
                );
            },
            cancellationToken: cancellationToken,
            options: _defaultCacheExpiration
        );

        // Update cache with token expiration if applicable
        if (result.HasSetExpiration is false)
        {
            result = result with { HasSetExpiration = true };
            await _tokenCache.SetAsync(
                cacheKey,
                result,
                options: CacheExpiry(result.Expiration),
                cancellationToken: cancellationToken
            );
        }

        return result.Token;
    }

    /// <summary>
    /// Handles the sending of grant requests to Maskinporten and parsing the returned response
    /// </summary>
    /// <param name="formattedScopes">A single space-separated string containing the scopes to authorize for.</param>
    /// <param name="cancellationToken">An optional cancellation token.</param>
    /// <returns><inheritdoc cref="GetAccessToken"/></returns>
    /// <exception cref="MaskinportenAuthenticationException"><inheritdoc cref="GetAccessToken"/></exception>
    private async Task<MaskinportenTokenResponse> HandleMaskinportenAuthentication(
        string formattedScopes,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            string jwt = GenerateJwtGrant(formattedScopes);
            FormUrlEncodedContent payload = GenerateAuthenticationPayload(jwt);

            _logger.LogDebug(
                "Sending grant request to Maskinporten: {GrantRequest}",
                await payload.ReadAsStringAsync(cancellationToken)
            );

            string tokenAuthority = _options.CurrentValue.Authority.Trim('/');
            using HttpClient client = _httpClientFactory.CreateClient();
            using HttpResponseMessage response = await client.PostAsync(
                $"{tokenAuthority}/token",
                payload,
                cancellationToken
            );
            MaskinportenTokenResponse token = await ParseServerResponse(response, cancellationToken);

            _logger.LogDebug("Token retrieved successfully");
            return token;
        }
        catch (MaskinportenException)
        {
            throw;
        }
        catch (Exception e)
        {
            throw new MaskinportenAuthenticationException($"Authentication with Maskinporten failed: {e.Message}", e);
        }
    }

    /// <summary>
    /// Generates a JWT grant for the supplied scope claims along with the pre-configured client id and private key.
    /// </summary>
    /// <param name="formattedScopes">A space-separated list of scopes to make a claim for.</param>
    /// <returns><inheritdoc cref="JsonWebTokenHandler.CreateToken(SecurityTokenDescriptor)"/></returns>
    /// <exception cref="MaskinportenConfigurationException"></exception>
    internal string GenerateJwtGrant(string formattedScopes)
    {
        MaskinportenSettings? settings;
        try
        {
            settings = _options.CurrentValue;
        }
        catch (OptionsValidationException e)
        {
            throw new MaskinportenConfigurationException(
                $"Error reading MaskinportenSettings from the current app configuration",
                e
            );
        }

        var now = _timeprovider.GetUtcNow();
        var expiry = now.AddMinutes(2);
        var jwtDescriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.ClientId,
            Audience = settings.Authority,
            IssuedAt = now.UtcDateTime,
            Expires = expiry.UtcDateTime,
            SigningCredentials = new SigningCredentials(settings.GetJsonWebKey(), SecurityAlgorithms.RsaSha256),
            Claims = new Dictionary<string, object> { ["scope"] = formattedScopes, ["jti"] = Guid.NewGuid().ToString() }
        };

        return new JsonWebTokenHandler().CreateToken(jwtDescriptor);
    }

    /// <summary>
    /// <para>
    /// Generates an authentication payload from the supplied JWT (see <see cref="GenerateJwtGrant"/>).
    /// </para>
    /// <para>
    /// This payload needs to be a <see cref="FormUrlEncodedContent"/> object with some precise parameters,
    /// as per <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument#5-be-om-token">the docs.</a>.
    /// </para>
    /// </summary>
    /// <param name="jwtAssertion">The JWT token generated by <see cref="GenerateJwtGrant"/>.</param>
    internal static FormUrlEncodedContent GenerateAuthenticationPayload(string jwtAssertion)
    {
        return new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = jwtAssertion
            }
        );
    }

    /// <summary>
    /// Parses the Maskinporten server response and deserializes the JSON body.
    /// </summary>
    /// <param name="httpResponse">The server response.</param>
    /// <param name="cancellationToken">An optional cancellation token.</param>
    /// <returns>A <see cref="MaskinportenTokenResponse"/> for successful requests.</returns>
    /// <exception cref="MaskinportenAuthenticationException">Authentication failed.
    /// This could be caused by an authentication/authorization issue or a myriad of tother circumstances.</exception>
    internal static async Task<MaskinportenTokenResponse> ParseServerResponse(
        HttpResponseMessage httpResponse,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            string content = await httpResponse.Content.ReadAsStringAsync(cancellationToken);

            try
            {
                if (!httpResponse.IsSuccessStatusCode)
                {
                    throw new MaskinportenAuthenticationException(
                        $"Maskinporten authentication failed with status code {(int)httpResponse.StatusCode} ({httpResponse.StatusCode}): {content}"
                    );
                }

                return JsonSerializer.Deserialize<MaskinportenTokenResponse>(content)
                    ?? throw new JsonException("JSON body is null");
            }
            catch (JsonException e)
            {
                throw new MaskinportenAuthenticationException(
                    $"Maskinporten replied with invalid JSON formatting: {content}",
                    e
                );
            }
        }
        catch (MaskinportenException)
        {
            throw;
        }
        catch (Exception e)
        {
            throw new MaskinportenAuthenticationException($"Authentication with Maskinporten failed: {e.Message}", e);
        }
    }

    /// <summary>
    /// Formats a list of scopes according to the expected formatting (space-delimited).
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument#5-be-om-token">the docs</a> for more information.
    /// </summary>
    /// <param name="scopes">A collection of scopes.</param>
    /// <returns>A single string containing the supplied scopes.</returns>
    internal static string FormattedScopes(IEnumerable<string> scopes) => string.Join(" ", scopes);

    internal static HybridCacheEntryOptions CacheExpiry(TimeSpan localExpiry, TimeSpan? overallExpiry = null)
    {
        return new HybridCacheEntryOptions
        {
            LocalCacheExpiration = localExpiry,
            Expiration = overallExpiry ?? localExpiry
        };
    }
}
