using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace StudioGateway.Api.Authentication;

internal sealed class MaskinportenClient(
    ILogger<MaskinportenClient> _logger,
    IOptionsMonitor<MaskinportenSettings> _settings,
    IOptionsMonitor<MaskinportenClientSettings> _clientSettings,
    IHostApplicationLifetime _lifetime
) : IDisposable
{
    private static readonly HttpClient _httpClient = new HttpClient(
        new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(10) }
    );

    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public void Dispose() => _semaphore.Dispose();

    private Uri? _metadataAddress;
    private Uri? _tokenEndpoint;
    private string? _audience;

    private MaskinportenTokenResponse? _currentToken;
    private DateTimeOffset _refreshAt;
    private DateTimeOffset _expiresAt;
    private int _refreshing;

    public ValueTask<string> GetToken(CancellationToken cancellationToken)
    {
        var token = Volatile.Read(ref _currentToken);
        var now = DateTimeOffset.UtcNow;

        if (token is not null && now < _expiresAt)
        {
            if (now >= _refreshAt && Interlocked.CompareExchange(ref _refreshing, 1, 0) == 0)
                _ = Task.Run(() => RefreshInBackground(), CancellationToken.None);
            return new ValueTask<string>(token.AccessToken);
        }

        return GetTokenAsync(cancellationToken);

        async ValueTask<string> GetTokenAsync(CancellationToken cancellationToken)
        {
            await _semaphore.WaitAsync(cancellationToken);
            try
            {
                token = Volatile.Read(ref _currentToken);
                if (token is not null && DateTimeOffset.UtcNow < _expiresAt)
                    return token.AccessToken;

                token = await GetTokenInternal(cancellationToken);
                UpdateTokenState(token);
                _logger.LogInformation("Acquired new Maskinporten token");
                return token.AccessToken;
            }
            finally
            {
                _semaphore.Release();
            }
        }
    }

    private void UpdateTokenState(MaskinportenTokenResponse token)
    {
        var now = DateTimeOffset.UtcNow;
        _refreshAt = now.AddSeconds(token.ExpiresIn - 60);
        _expiresAt = now.AddSeconds(token.ExpiresIn - 5);
        Volatile.Write(ref _currentToken, token);
    }

    private async Task RefreshInBackground()
    {
        var cancellationToken = _lifetime.ApplicationStopping;
        try
        {
            await _semaphore.WaitAsync(cancellationToken);
            try
            {
                var token = await GetTokenInternal(cancellationToken);
                UpdateTokenState(token);
                _logger.LogInformation("Background refresh: acquired new Maskinporten token");
            }
            finally
            {
                _semaphore.Release();
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Application is shutting down, ignore
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Background refresh failed, will retry on next request");
        }
        finally
        {
            Volatile.Write(ref _refreshing, 0);
        }
    }

    private async Task<MaskinportenTokenResponse> GetTokenInternal(CancellationToken cancellationToken)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(10));
        cancellationToken = cts.Token;

        await EnsureMetadataLoaded(cancellationToken);
        Debug.Assert(_tokenEndpoint is not null);
        Debug.Assert(_audience is not null);

        var assertion = CreateClientAssertion();
        using var content = new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = assertion,
            }
        );

        using var response = await _httpClient.PostAsync(_tokenEndpoint, content, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "Maskinporten token request failed with status {StatusCode}: {Error}",
                response.StatusCode,
                errorBody
            );
            throw new InvalidOperationException($"Maskinporten token request failed: {response.StatusCode}");
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        var tokenResponse =
            await JsonSerializer.DeserializeAsync(
                responseStream,
                MaskinportenJsonSerializerContext.Default.MaskinportenTokenResponse,
                cancellationToken
            ) ?? throw new InvalidOperationException("Failed to deserialize Maskinporten token response");

        return tokenResponse;
    }

    private string CreateClientAssertion()
    {
        var now = DateTimeOffset.UtcNow;
        var clientSettings = _clientSettings.CurrentValue;

        if (string.IsNullOrWhiteSpace(clientSettings.Jwk))
        {
            throw new InvalidOperationException(
                "MaskinportenClientForDesigner:Jwk is not configured. Ensure the secret is mounted correctly."
            );
        }

        // JsonSerializer.Deserialize properly initializes RSA key internals, unlike new JsonWebKey(string)
        var jwk =
            JsonSerializer.Deserialize(clientSettings.Jwk, MaskinportenJsonSerializerContext.Default.JsonWebKey)
            ?? throw new InvalidOperationException("Failed to deserialize JWK");

        if (!jwk.HasPrivateKey)
            throw new InvalidOperationException("The provided JWK does not contain a private key");

        var signingCredentials = new SigningCredentials(jwk, jwk.Alg);
        var header = new JwtHeader(signingCredentials);

        var payload = new JwtPayload
        {
            { "aud", _audience },
            { "scope", "altinn:studio/designer" },
            { "iss", clientSettings.ClientId },
            { "exp", now.AddMinutes(2).ToUnixTimeSeconds() },
            { "iat", now.ToUnixTimeSeconds() },
            { "jti", Guid.NewGuid().ToString() },
        };

        var token = new JwtSecurityToken(header, payload);
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(token);
    }

    private async ValueTask EnsureMetadataLoaded(CancellationToken cancellationToken)
    {
        var settings = _settings.CurrentValue;
        var currentMetadataAddressUri = new Uri(settings.ClientMetadataAddress);
        if (_tokenEndpoint is not null && _audience is not null && currentMetadataAddressUri == _metadataAddress)
            return;

        await using var responseStream = await _httpClient.GetStreamAsync(currentMetadataAddressUri, cancellationToken);
        var metadata =
            await JsonSerializer.DeserializeAsync(
                responseStream,
                MaskinportenJsonSerializerContext.Default.OidcMetadataResponse,
                cancellationToken
            ) ?? throw new InvalidOperationException("Failed to deserialize OIDC metadata");

        _tokenEndpoint = new Uri(metadata.TokenEndpoint);
        _metadataAddress = currentMetadataAddressUri;
        _audience = metadata.Issuer;

        _logger.LogInformation(
            "Loaded Maskinporten metadata: tokenEndpoint={TokenEndpoint}, audience={Audience}",
            _tokenEndpoint,
            _audience
        );
    }
}
