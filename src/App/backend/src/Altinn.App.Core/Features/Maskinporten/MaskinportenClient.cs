using System.Diagnostics;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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
using SystemUserAuthorizationDetail = Altinn.App.Core.Features.Maskinporten.Constants.JwtClaimTypes.Maskinporten.SystemUserAuthorizationDetail;

namespace Altinn.App.Core.Features.Maskinporten;

/// <inheritdoc/>
internal sealed class MaskinportenClient : IMaskinportenClient
{
    /// <summary>
    /// The margin to take into consideration when determining if a token has expired (seconds).
    /// <remarks>This value represents the worst-case latency scenario for <em>outbound</em> connections carrying the access token.</remarks>
    /// </summary>
    internal static readonly TimeSpan TokenExpirationMargin = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Duration to cache the OAuth well-known metadata (issuer) before refreshing.
    /// </summary>
    internal static readonly TimeSpan WellKnownCacheDuration = TimeSpan.FromHours(1);

    /// <summary>
    /// Upper bound for a single outbound call to Maskinporten or the Altinn token exchange endpoint.
    /// <remarks>Without this, these calls inherit the 100 second <see cref="HttpClient"/> default, which is far
    /// longer than any caller waiting on a token can reasonably tolerate.</remarks>
    /// </summary>
    internal static readonly TimeSpan RequestTimeout = TimeSpan.FromSeconds(30);

    private sealed record WellKnownCacheEntry(string Issuer, DateTimeOffset FetchedAt);

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

    // Well-known cache with background refresh
    private WellKnownCacheEntry? _wellKnownCache;
    private int _wellKnownRefreshing;

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
    public Task<JwtToken> GetAccessToken(IEnumerable<string> scopes, CancellationToken cancellationToken = default) =>
        GetAccessToken(new MaskinportenTokenRequest { Scopes = scopes }, cancellationToken);

    /// <inheritdoc/>
    public async Task<JwtToken> GetAccessToken(
        MaskinportenTokenRequest request,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(request);

        var result = await GetOrCreateTokenFromCache(TokenAuthority.Maskinporten, request, cancellationToken);
        return result.Token;
    }

    /// <inheritdoc/>
    public Task<JwtToken> GetAltinnExchangedToken(
        IEnumerable<string> scopes,
        CancellationToken cancellationToken = default
    ) => GetAltinnExchangedToken(new MaskinportenTokenRequest { Scopes = scopes }, cancellationToken);

    /// <inheritdoc/>
    public async Task<JwtToken> GetAltinnExchangedToken(
        MaskinportenTokenRequest request,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(request);

        var result = await GetOrCreateTokenFromCache(TokenAuthority.AltinnTokenExchange, request, cancellationToken);
        return result.Token;
    }

    /// <summary>
    /// <para>Retrieves a token from the cache, or creates a new one if it does not exist.</para>
    /// Based on the supplied <see cref="TokenAuthority"/>, either <see cref="MaskinportenTokenFactory"/> or <see cref="AltinnTokenFactory"/>
    /// will be invoked to create new tokens.
    /// </summary>
    internal async Task<TokenCacheEntry> GetOrCreateTokenFromCache(
        TokenAuthority authority,
        MaskinportenTokenRequest request,
        CancellationToken cancellationToken = default
    )
    {
        string cacheKey = GetCacheKey(authority, request);

        _logger.LogDebug("Retrieving {Authority} token for scopes: {Scopes}", authority, request.FormattedScopes);
        using var activity = TelemetryStartActivityFactory(authority, Variant, Settings.ClientId, request);

        // We are making some binary assumptions below, so lets guard against future expansion of the TokenAuthority enum.
        if (authority is not (TokenAuthority.Maskinporten or TokenAuthority.AltinnTokenExchange))
            throw new ArgumentException($"Unknown token authority {authority}", nameof(authority));

        Func<CacheFactoryState, CancellationToken, ValueTask<TokenCacheEntry>> tokenFactory =
            authority == TokenAuthority.Maskinporten ? MaskinportenTokenFactory : AltinnTokenFactory;

        var result = await _tokenCache.GetOrCreateAsync(
            cacheKey,
            new CacheFactoryState(this, request),
            tokenFactory,
            cancellationToken: cancellationToken,
            options: _defaultCacheExpiration
        );

        // Newly created token: Set the cache expiration and return result. Metrics are recorded in the factory methods.
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

            return result;
        }

        // Token retrieved from cache: Handle some metrics and return the result.
        _logger.LogDebug("Token retrieved from cache: {Token}", result.Token);

        if (authority == TokenAuthority.Maskinporten)
            _telemetry?.RecordMaskinportenTokenRequest(Telemetry.Maskinporten.RequestResult.Cached);
        else
            _telemetry?.RecordMaskinportenAltinnTokenExchangeRequest(Telemetry.Maskinporten.RequestResult.Cached);

        return result;
    }

    /// <summary>
    /// Handles the sending of grant requests to Maskinporten and parsing the returned response.
    /// </summary>
    /// <param name="request">The token request to build a grant assertion from.</param>
    /// <param name="cancellationToken">An optional cancellation token.</param>
    /// <returns><inheritdoc cref="GetAccessToken(MaskinportenTokenRequest, CancellationToken)"/></returns>
    /// <exception cref="MaskinportenAuthenticationException"><inheritdoc cref="GetAccessToken(MaskinportenTokenRequest, CancellationToken)"/></exception>
    private async Task<JwtToken> HandleMaskinportenAuthentication(
        MaskinportenTokenRequest request,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            _logger.LogDebug("Using MaskinportenClient.Variant={Variant} for authorization", Variant);
            string audience = await GetAudienceFromWellKnown(cancellationToken);
            string jwtGrant = GenerateJwtGrant(request, audience);
            FormUrlEncodedContent payload = AuthenticationPayloadFactory(jwtGrant);

            if (_logger.IsEnabled(LogLevel.Debug))
                _logger.LogDebug("Sending grant request to Maskinporten with assertion: {Assertion}", Mask(jwtGrant));

            string tokenUri = Settings.Authority.Trim('/') + "/token";
            using HttpClient client = _httpClientFactory.CreateClient();
            using var timeout = CreateTimeout(cancellationToken);
            using HttpResponseMessage response = await client.PostAsync(tokenUri, payload, timeout.Token);

            MaskinportenTokenResponse tokenResponse = await ParseServerResponse(response, timeout.Token);

            _logger.LogDebug("Token retrieved successfully from remote: {Token}", tokenResponse);
            _telemetry?.RecordMaskinportenTokenRequest(Telemetry.Maskinporten.RequestResult.New);

            return tokenResponse.AccessToken;
        }
        catch (MaskinportenException)
        {
            throw;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
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
    /// <returns><inheritdoc cref="GetAltinnExchangedToken(MaskinportenTokenRequest, CancellationToken)"/></returns>
    /// <exception cref="MaskinportenAuthenticationException"><inheritdoc cref="GetAltinnExchangedToken(MaskinportenTokenRequest, CancellationToken)"/></exception>
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

            string exchangeUri = _platformSettings.ApiAuthenticationEndpoint.TrimEnd('/') + "/exchange/maskinporten";
            using HttpClient client = _httpClientFactory.CreateClient();

            using var request = new HttpRequestMessage(HttpMethod.Get, exchangeUri);
            request.Headers.TryAddWithoutValidation(
                General.SubscriptionKeyHeaderName,
                _platformSettings.SubscriptionKey
            );
            request.Headers.Authorization = new AuthenticationHeaderValue(
                AuthorizationSchemes.Bearer,
                maskinportenToken.Value
            );

            using var timeout = CreateTimeout(cancellationToken);
            using HttpResponseMessage response = await client.SendAsync(request, timeout.Token);
            response.EnsureSuccessStatusCode();

            string tokenResponse = await response.Content.ReadAsStringAsync(timeout.Token);
            JwtToken token = JwtToken.Parse(tokenResponse);

            _logger.LogDebug("Token retrieved successfully from remote: {Token}", token);
            _telemetry?.RecordMaskinportenAltinnTokenExchangeRequest(Telemetry.Maskinporten.RequestResult.New);

            return token;
        }
        catch (MaskinportenException)
        {
            throw;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
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
    /// Generates a JWT grant for the supplied token request along with the pre-configured client id and private key.
    /// </summary>
    /// <param name="request">The token request to build a grant assertion from.</param>
    /// <param name="audience">The audience claim value (typically the OAuth issuer from well-known metadata).</param>
    /// <returns><inheritdoc cref="JsonWebTokenHandler.CreateToken(SecurityTokenDescriptor)"/></returns>
    /// <exception cref="MaskinportenConfigurationException"></exception>
    internal string GenerateJwtGrant(MaskinportenTokenRequest request, string audience)
    {
        MaskinportenSettings? settings;
        try
        {
            settings = Settings;
        }
        catch (OptionsValidationException e)
        {
            throw new MaskinportenConfigurationException(
                "Error reading MaskinportenSettings from the current app configuration",
                e
            );
        }

        var claims = new Dictionary<string, object>
        {
            [JwtClaimTypes.Scope] = request.FormattedScopes,
            [JwtClaimTypes.JwtId] = Guid.NewGuid().ToString(),
        };

        if (request.ConsumerOrg is { } consumerOrg)
            claims[JwtClaimTypes.Maskinporten.ConsumerOrg] = consumerOrg.Get(OrganisationNumberFormat.Local);

        if (request.Resource is { } resource)
            claims[JwtClaimTypes.Maskinporten.Resource] = resource;

        if (request.SystemUser is { } systemUser)
            claims[JwtClaimTypes.Maskinporten.AuthorizationDetails] = SystemUserAuthorizationDetails(systemUser);

        var now = _timeProvider.GetUtcNow();
        var expiry = now.AddMinutes(2);
        var jwtDescriptor = new SecurityTokenDescriptor
        {
            Issuer = settings.ClientId,
            Audience = audience,
            IssuedAt = now.UtcDateTime,
            Expires = expiry.UtcDateTime,
            SigningCredentials = new SigningCredentials(settings.GetJsonWebKey(), SecurityAlgorithms.RsaSha256),
            Claims = claims,
        };

        return new JsonWebTokenHandler().CreateToken(jwtDescriptor);
    }

    /// <summary>
    /// Builds the <c>authorization_details</c> claim value for a system user grant. Always a single-entry array,
    /// as only one party can be queried per token.
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_func_systembruker">the docs</a>.
    /// </summary>
    internal static List<Dictionary<string, object>> SystemUserAuthorizationDetails(MaskinportenSystemUser systemUser)
    {
        var detail = new Dictionary<string, object>
        {
            [SystemUserAuthorizationDetail.TypeKey] = SystemUserAuthorizationDetail.TypeValue,
            [SystemUserAuthorizationDetail.OrganisationKey] = new Dictionary<string, object>
            {
                [SystemUserAuthorizationDetail.AuthorityKey] = SystemUserAuthorizationDetail.AuthorityValue,
                [SystemUserAuthorizationDetail.IdentifierKey] = systemUser.Organisation.Get(
                    OrganisationNumberFormat.International
                ),
            },
        };

        if (systemUser.ExternalRef is { } externalRef)
            detail[SystemUserAuthorizationDetail.ExternalRefKey] = externalRef;

        return [detail];
    }

    /// <summary>
    /// <p>Generates an authentication payload from the supplied JWT (see <see cref="GenerateJwtGrant"/>).</p>
    /// <p>This payload needs to be a <see cref="FormUrlEncodedContent"/> object with some precise parameters,
    /// as per <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument#5-be-om-token">the docs</a>.</p>
    /// </summary>
    /// <param name="jwtAssertion">The JWT token generated by <see cref="GenerateJwtGrant"/>.</param>
    internal static FormUrlEncodedContent AuthenticationPayloadFactory(string jwtAssertion) =>
        new(
            new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = jwtAssertion,
            }
        );

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
    /// <para>Generates a cache key for the supplied authority and request.</para>
    /// <para>Scopes-only requests use the format <c>{salt}_{formattedScopes}</c>. Requests carrying any of the
    /// additional claims use <c>{salt}#{claims}|{formattedScopes}</c>, where the claim segment is percent-encoded.
    /// Every claim that alters the identity of the resulting token must be part of the key, or we risk serving a
    /// token minted for the wrong organisation or resource.</para>
    /// </summary>
    internal string GetCacheKey(TokenAuthority authority, MaskinportenTokenRequest request)
    {
        var salt = authority switch
        {
            TokenAuthority.Maskinporten => _maskinportenCacheKeySalt,
            TokenAuthority.AltinnTokenExchange => _altinnCacheKeySalt,
            _ => throw new ArgumentException($"Unknown token authority {authority}", nameof(authority)),
        };

        if (request is { ConsumerOrg: null, Resource: null, SystemUser: null })
            return $"{salt}_{request.FormattedScopes}";

        // `Uri.EscapeDataString` never emits `|`, so the field boundaries stay unambiguous for arbitrary input.
        // `#` cannot occur in the salt, so an extended key can never collide with a scopes-only one either.
        var consumerOrg = Escape(request.ConsumerOrg?.Get(OrganisationNumberFormat.Local));
        var resource = Escape(request.Resource);
        var systemUserOrg = Escape(request.SystemUser?.Organisation.Get(OrganisationNumberFormat.International));
        var systemUserRef = Escape(request.SystemUser?.ExternalRef);

        return $"{salt}#{consumerOrg}|{resource}|{systemUserOrg}|{systemUserRef}|{request.FormattedScopes}";

        static string Escape(string? value) => value is null ? string.Empty : Uri.EscapeDataString(value);
    }

    /// <summary>
    /// Formats a list of scopes according to the expected formatting (space-delimited).
    /// See <a href="https://docs.digdir.no/docs/Maskinporten/maskinporten_guide_apikonsument#5-be-om-token">the docs</a> for more information.
    /// </summary>
    /// <param name="scopes">A collection of scopes.</param>
    /// <returns>A single string containing the supplied scopes.</returns>
    internal static string GetFormattedScopes(IEnumerable<string> scopes) =>
        new MaskinportenTokenRequest { Scopes = scopes }.FormattedScopes;

    /// <summary>
    /// Retrieves the OAuth issuer from the well-known metadata endpoint for use as the JWT audience claim.
    /// Uses cached value if fresh. When stale, triggers background refresh and returns stale value immediately.
    /// Only blocks on first call (cold start).
    /// </summary>
    internal ValueTask<string> GetAudienceFromWellKnown(CancellationToken cancellationToken = default)
    {
        var cached = Volatile.Read(ref _wellKnownCache);
        var now = _timeProvider.GetUtcNow();

        // Fresh cache - return immediately
        if (cached is not null && now - cached.FetchedAt < WellKnownCacheDuration)
        {
            return new ValueTask<string>(cached.Issuer);
        }

        // Stale cache - trigger background refresh, return stale immediately
        if (cached is not null)
        {
            if (Interlocked.CompareExchange(ref _wellKnownRefreshing, 1, 0) == 0)
            {
                _ = Task.Run(() => RefreshWellKnownInBackground(), cancellationToken);
            }
            return new ValueTask<string>(cached.Issuer);
        }

        // No cache (cold start) - must block and fetch
        return FetchWellKnownBlocking(cancellationToken);
    }

    private async ValueTask<string> FetchWellKnownBlocking(CancellationToken cancellationToken)
    {
        try
        {
            var metadata = await FetchWellKnownMetadata(Settings.Authority, cancellationToken);
            var now = _timeProvider.GetUtcNow();
            Volatile.Write(ref _wellKnownCache, new WellKnownCacheEntry(metadata.Issuer, now));
            return metadata.Issuer;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch OAuth metadata, falling back to authority");
            var authorityFallback = Settings.Authority;
            if (authorityFallback[^1] != '/')
                authorityFallback += '/';
            return authorityFallback;
        }
    }

    private async Task RefreshWellKnownInBackground()
    {
        try
        {
            var metadata = await FetchWellKnownMetadata(Settings.Authority, CancellationToken.None);
            var now = _timeProvider.GetUtcNow();
            Volatile.Write(ref _wellKnownCache, new WellKnownCacheEntry(metadata.Issuer, now));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Background refresh of OAuth metadata failed");
        }
        finally
        {
            Volatile.Write(ref _wellKnownRefreshing, 0);
        }
    }

    private async Task<OAuthAuthorizationServerMetadata> FetchWellKnownMetadata(
        string authority,
        CancellationToken cancellationToken
    )
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10));
        cancellationToken = cts.Token;
        var wellKnownUrl = new Uri(new Uri(authority), ".well-known/oauth-authorization-server");
        using var client = _httpClientFactory.CreateClient();
        using var response = await client.GetAsync(wellKnownUrl, cancellationToken);
        response.EnsureSuccessStatusCode();

        var metadata = await response.Content.ReadFromJsonAsync<OAuthAuthorizationServerMetadata>(
            cancellationToken: cancellationToken
        );
        return metadata ?? throw new JsonException("Well-known metadata response was null");
    }

    /// <summary>
    /// Links the caller's cancellation token to a <see cref="RequestTimeout"/> budget for a single outbound call.
    /// </summary>
    private static CancellationTokenSource CreateTimeout(CancellationToken cancellationToken)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(RequestTimeout);
        return cts;
    }

    /// <summary>
    /// Renders a JWT with its signature masked, matching how <see cref="JwtToken"/> stringifies itself. The grant
    /// assertion is a short-lived but replayable credential, so the signature must not reach the logs.
    /// </summary>
    private static string Mask(string jwt) =>
        JwtToken.TryParse(jwt, out var token) ? token.ToString() : "<unparseable>";

    private TimeSpan GetTokenExpiryWithMargin(JwtToken token) =>
        token.ExpiresAt - _timeProvider.GetUtcNow() - TokenExpirationMargin;

    private static HybridCacheEntryOptions CacheExpiryFactory(TimeSpan localExpiry, TimeSpan? overallExpiry = null) =>
        new() { LocalCacheExpiration = localExpiry, Expiration = overallExpiry ?? localExpiry };

    /// <summary>
    /// This method simply forwards the activity request to the telemetry service and returns the resulting instance.
    /// </summary>
    private Activity? TelemetryStartActivityFactory(
        TokenAuthority authority,
        string variant,
        string clientId,
        MaskinportenTokenRequest request
    ) =>
        authority switch
        {
            TokenAuthority.Maskinporten => _telemetry?.StartGetAccessTokenActivity(variant, clientId, request),
            TokenAuthority.AltinnTokenExchange => _telemetry?.StartGetAltinnExchangedAccessTokenActivity(
                variant,
                clientId,
                request
            ),
            _ => throw new ArgumentException($"Unknown token authority {authority}", nameof(authority)),
        };

    /// <summary>
    /// Factory method for creating a new Maskinporten token, in the context of <see cref="GetOrCreateTokenFromCache"/>.
    /// This is mainly a wrapper for <see cref="HandleMaskinportenAuthentication"/> with some additional cache-specific logic.
    /// </summary>
    private static async ValueTask<TokenCacheEntry> MaskinportenTokenFactory(
        CacheFactoryState state,
        CancellationToken cancellationToken
    )
    {
        state.Self._logger.LogDebug("Token is not in cache, generating new");

        JwtToken token = await state.Self.HandleMaskinportenAuthentication(state.Request, cancellationToken);

        var expiresIn = state.Self.GetTokenExpiryWithMargin(token);
        if (expiresIn <= TimeSpan.Zero)
        {
            throw new MaskinportenTokenExpiredException(
                $"Access token cannot be used because it has a calculated expiration in the past (taking into account a margin of {TokenExpirationMargin} seconds): {token}"
            );
        }

        return new TokenCacheEntry(Token: token, ExpiresIn: expiresIn, HasSetExpiration: false);
    }

    /// <summary>
    /// Factory method for creating a new Altinn-exchanged token, in the context of <see cref="GetOrCreateTokenFromCache"/>
    /// This is mainly a wrapper for <see cref="GetAccessToken(MaskinportenTokenRequest, CancellationToken)"/> + <see cref="HandleMaskinportenAltinnTokenExchange"/>
    /// with some additional cache-specific logic.
    /// </summary>
    /// <remarks><see cref="GetAccessToken(MaskinportenTokenRequest, CancellationToken)"/> itself may or may not return a cached response.</remarks>
    private static async ValueTask<TokenCacheEntry> AltinnTokenFactory(
        CacheFactoryState state,
        CancellationToken cancellationToken
    )
    {
        state.Self._logger.LogDebug("Token is not in cache, generating new");
        JwtToken maskinportenToken = await state.Self.GetAccessToken(state.Request, cancellationToken);
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
    }

    private sealed record CacheFactoryState(MaskinportenClient Self, MaskinportenTokenRequest Request);
}
