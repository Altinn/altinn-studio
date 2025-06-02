using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Core.Features.Maskinporten;

/// <inheritdoc/>
internal sealed class MaskinportenClient : IMaskinportenClient
{
    /// <summary>
    /// The margin to take into consideration when determining if a token has expired (seconds).
    /// <remarks>This value represents the worst-case latency scenario for <em>outbound</em> connections carrying the access token.</remarks>
    /// </summary>
    internal static readonly TimeSpan TokenExpirationMargin = TimeSpan.FromSeconds(30);

    internal MaskinportenSettings Settings =>
        _options.Get(Variant == VariantDefault ? Microsoft.Extensions.Options.Options.DefaultName : Variant);

    internal const string VariantDefault = "default";
    internal const string VariantInternal = "internal";
    internal readonly string Variant;

    private readonly string _maskinportenCacheKeySalt;
    private readonly string _altinnCacheKeySalt;
    private static readonly HybridCacheEntryOptions _defaultCacheExpiration = CacheExpiryFactory(
        TimeSpan.FromSeconds(60)
    );
    private readonly ILogger<MaskinportenClient> _logger;
    private readonly IOptionsMonitor<MaskinportenSettings> _options;
    private readonly PlatformSettings _platformSettings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TimeProvider _timeProvider;
    private readonly HybridCache _tokenCache;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Instantiates a new <see cref="MaskinportenClient"/> object.
    /// </summary>
    /// <param name="variant">Variant (default/internal).</param>
    /// <param name="options">Maskinporten settings.</param>
    /// <param name="platformSettings">Platform settings.</param>
    /// <param name="httpClientFactory">HttpClient factory.</param>
    /// <param name="tokenCache">Token cache store.</param>
    /// <param name="logger">Logger interface.</param>
    /// <param name="timeProvider">Optional TimeProvider implementation.</param>
    /// <param name="telemetry">Optional telemetry service.</param>
    public MaskinportenClient(
        string variant,
        IOptionsMonitor<MaskinportenSettings> options,
        IOptions<PlatformSettings> platformSettings,
        IHttpClientFactory httpClientFactory,
        HybridCache tokenCache,
        ILogger<MaskinportenClient> logger,
        TimeProvider? timeProvider = null,
        Telemetry? telemetry = null
    )
    {
        if (variant != VariantDefault && variant != VariantInternal)
            throw new ArgumentException($"Invalid variant '{variant}' provided to MaskinportenClient");

        Variant = variant;
        _maskinportenCacheKeySalt = $"maskinportenScope-{variant}";
        _altinnCacheKeySalt = $"maskinportenScope-altinn-{variant}";
        _options = options;
        _platformSettings = platformSettings.Value;
        _telemetry = telemetry;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _tokenCache = tokenCache;
    }

    /// <inheritdoc/>
    public async Task<JwtToken> GetAccessToken(
        IEnumerable<string> scopes,
        CancellationToken cancellationToken = default
    )
    {
        string formattedScopes = FormattedScopes(scopes);
        string cacheKey = $"{_maskinportenCacheKeySalt}_{formattedScopes}";
        DateTimeOffset referenceTime = _timeProvider.GetUtcNow();

        _logger.LogDebug("Retrieving Maskinporten token for scopes: {Scopes}", formattedScopes);
        using var activity = _telemetry?.StartGetAccessTokenActivity(Variant, Settings.ClientId, formattedScopes);

        var result = await _tokenCache.GetOrCreateAsync(
            cacheKey,
            (Self: this, FormattedScopes: formattedScopes, ReferenceTime: referenceTime),
            static async (state, cancellationToken) =>
            {
                state.Self._logger.LogDebug("Token is not in cache, generating new");

                JwtToken token = await state.Self.HandleMaskinportenAuthentication(
                    state.FormattedScopes,
                    cancellationToken
                );

                var expiresIn = state.Self.GetTokenExpiryWithMargin(token);
                if (expiresIn <= TimeSpan.Zero)
                {
                    throw new MaskinportenTokenExpiredException(
                        $"Access token cannot be used because it has a calculated expiration in the past (taking into account a margin of {TokenExpirationMargin} seconds): {token}"
                    );
                }

                return new TokenCacheEntry(Token: token, ExpiresIn: expiresIn, HasSetExpiration: false);
            },
            cancellationToken: cancellationToken,
            options: _defaultCacheExpiration
        );

        if (result.HasSetExpiration is false)
        {
            _logger.LogDebug("Updating token cache with appropriate expiration");
            result = result with { HasSetExpiration = true };
            await _tokenCache.SetAsync(
                cacheKey,
                result,
                options: CacheExpiryFactory(result.ExpiresIn),
                cancellationToken: cancellationToken
            );
        }
        else
        {
            _logger.LogDebug("Token retrieved from cache: {Token}", result.Token);
            _telemetry?.RecordMaskinportenTokenRequest(Telemetry.Maskinporten.RequestResult.Cached);
        }

        return result.Token;
    }

    /// <inheritdoc/>
    public async Task<JwtToken> GetAltinnExchangedToken(
        IEnumerable<string> scopes,
        CancellationToken cancellationToken = default
    )
    {
        string formattedScopes = FormattedScopes(scopes);
        string cacheKey = $"{_altinnCacheKeySalt}_{formattedScopes}";

        _logger.LogDebug("Retrieving Altinn token for scopes: {Scopes}", formattedScopes);
        using var activity = _telemetry?.StartGetAltinnExchangedAccessTokenActivity(
            Variant,
            Settings.ClientId,
            formattedScopes
        );

        var result = await _tokenCache.GetOrCreateAsync(
            cacheKey,
            (Self: this, Scopes: scopes),
            static async (state, cancellationToken) =>
            {
                state.Self._logger.LogDebug("Token is not in cache, generating new");
                JwtToken maskinportenToken = await state.Self.GetAccessToken(state.Scopes, cancellationToken);
                JwtToken altinnToken = await state.Self.HandleMaskinportenAltinnTokenExchange(
                    maskinportenToken,
                    cancellationToken
                );

                var expiresIn = state.Self.GetTokenExpiryWithMargin(altinnToken);
                if (expiresIn <= TimeSpan.Zero)
                {
                    throw new MaskinportenTokenExpiredException(
                        $"Access token cannot be used because it has a calculated expiration in the past (taking into account a margin of {TokenExpirationMargin} seconds): {altinnToken}"
                    );
                }

                return new TokenCacheEntry(Token: altinnToken, ExpiresIn: expiresIn, HasSetExpiration: false);
            },
            cancellationToken: cancellationToken,
            options: _defaultCacheExpiration
        );

        if (result.HasSetExpiration is false)
        {
            _logger.LogDebug("Updating token cache with appropriate expiration");
            result = result with { HasSetExpiration = true };
            await _tokenCache.SetAsync(
                cacheKey,
                result,
                options: CacheExpiryFactory(result.ExpiresIn),
                cancellationToken: cancellationToken
            );
        }
        else
        {
            _logger.LogDebug("Token retrieved from cache: {Token}", result.Token);
            _telemetry?.RecordMaskinportenAltinnTokenExchangeRequest(Telemetry.Maskinporten.RequestResult.Cached);
        }

        return result.Token;
    }

    /// <summary>
    /// Handles the sending of grant requests to Maskinporten and parsing the returned response.
    /// </summary>
    /// <param name="formattedScopes">A single space-separated string containing the scopes to authorize for.</param>
    /// <param name="cancellationToken">An optional cancellation token.</param>
    /// <returns><inheritdoc cref="GetAccessToken"/></returns>
    /// <exception cref="MaskinportenAuthenticationException"><inheritdoc cref="GetAccessToken"/></exception>
    private async Task<JwtToken> HandleMaskinportenAuthentication(
        string formattedScopes,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            _logger.LogDebug("Using MaskinportenClient.Variant={Variant} for authorization", Variant);
            string jwtGrant = GenerateJwtGrant(formattedScopes);
            FormUrlEncodedContent payload = AuthenticationPayloadFactory(jwtGrant);

            _logger.LogDebug(
                "Sending grant request to Maskinporten: {GrantRequest}",
                await payload.ReadAsStringAsync(cancellationToken)
            );

            string tokenAuthority = Settings.Authority.Trim('/');
            using HttpClient client = _httpClientFactory.CreateClient();
            using HttpResponseMessage response = await client.PostAsync(
                $"{tokenAuthority}/token",
                payload,
                cancellationToken
            );

            MaskinportenTokenResponse tokenResponse = await ParseServerResponse(response, cancellationToken);

            _logger.LogDebug("Token retrieved successfully: {Token}", tokenResponse);
            _telemetry?.RecordMaskinportenTokenRequest(Telemetry.Maskinporten.RequestResult.New);

            return tokenResponse.AccessToken;
        }
        catch (MaskinportenException)
        {
            throw;
        }
        catch (Exception e)
        {
            _telemetry?.RecordMaskinportenTokenRequest(Telemetry.Maskinporten.RequestResult.Error);
            throw new MaskinportenAuthenticationException($"Authentication with Maskinporten failed: {e.Message}", e);
        }
    }

    /// <summary>
    /// Handles the exchange of a Maskinporten token for an Altinn token.
    /// </summary>
    /// <param name="maskinportenToken">A Maskinporten issued token object</param>
    /// <param name="cancellationToken">An optional cancellation token.</param>
    /// <returns><inheritdoc cref="GetAltinnExchangedToken"/></returns>
    /// <exception cref="MaskinportenAuthenticationException"><inheritdoc cref="GetAltinnExchangedToken"/></exception>
    private async Task<JwtToken> HandleMaskinportenAltinnTokenExchange(
        JwtToken maskinportenToken,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            _logger.LogDebug(
                "Sending exchange request to Altinn Authentication with Bearer token: {MaskinportenToken}",
                maskinportenToken
            );

            using HttpClient client = _httpClientFactory.CreateClient();
            string url = _platformSettings.ApiAuthenticationEndpoint.TrimEnd('/') + "/exchange/maskinporten";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.TryAddWithoutValidation(
                General.SubscriptionKeyHeaderName,
                _platformSettings.SubscriptionKey
            );
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", maskinportenToken.Value);

            using HttpResponseMessage response = await client.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            string tokenResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            JwtToken token = JwtToken.Parse(tokenResponse);

            _logger.LogDebug("Token retrieved successfully: {Token}", token);
            _telemetry?.RecordMaskinportenAltinnTokenExchangeRequest(Telemetry.Maskinporten.RequestResult.New);

            return token;
        }
        catch (MaskinportenException)
        {
            throw;
        }
        catch (Exception e)
        {
            _telemetry?.RecordMaskinportenAltinnTokenExchangeRequest(Telemetry.Maskinporten.RequestResult.Error);
            throw new MaskinportenAuthenticationException($"Authentication with Altinn failed: {e.Message}", e);
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
            settings = Settings;
        }
        catch (OptionsValidationException e)
        {
            throw new MaskinportenConfigurationException(
                $"Error reading MaskinportenSettings from the current app configuration",
                e
            );
        }

        var now = _timeProvider.GetUtcNow();
        var expiry = now.AddMinutes(2);
        var jwtDescriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.ClientId,
            Audience = settings.Authority,
            IssuedAt = now.UtcDateTime,
            Expires = expiry.UtcDateTime,
            SigningCredentials = new SigningCredentials(settings.GetJsonWebKey(), SecurityAlgorithms.RsaSha256),
            Claims = new Dictionary<string, object>
            {
                [JwtClaimTypes.Scope] = formattedScopes,
                [JwtClaimTypes.JwtId] = Guid.NewGuid().ToString(),
            },
        };

        return new JsonWebTokenHandler().CreateToken(jwtDescriptor);
    }

    /// <summary>
    /// <p>Generates an authentication payload from the supplied JWT (see <see cref="GenerateJwtGrant"/>).</p>
    /// <p>This payload needs to be a <see cref="FormUrlEncodedContent"/> object with some precise parameters,
    /// as per <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument#5-be-om-token">the docs</a>.</p>
    /// </summary>
    /// <param name="jwtAssertion">The JWT token generated by <see cref="GenerateJwtGrant"/>.</param>
    internal static FormUrlEncodedContent AuthenticationPayloadFactory(string jwtAssertion)
    {
        return new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = jwtAssertion,
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
    /// This could be caused by an authentication/authorisation issue or a myriad of other circumstances.</exception>
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

    private static HybridCacheEntryOptions CacheExpiryFactory(TimeSpan localExpiry, TimeSpan? overallExpiry = null)
    {
        return new HybridCacheEntryOptions
        {
            LocalCacheExpiration = localExpiry,
            Expiration = overallExpiry ?? localExpiry,
        };
    }

    private TimeSpan GetTokenExpiryWithMargin(JwtToken token)
    {
        return token.ExpiresAt - _timeProvider.GetUtcNow() - TokenExpirationMargin;
    }
}
