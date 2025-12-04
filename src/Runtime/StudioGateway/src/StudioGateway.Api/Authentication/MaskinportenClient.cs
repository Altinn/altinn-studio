using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace StudioGateway.Api.Authentication;

internal sealed class MaskinportenClient(
    IOptionsMonitor<MaskinportenSettings> _settings,
    IOptionsMonitor<MaskinportenClientSettings> _clientSettings,
    ILogger<MaskinportenClient> _logger
) : IHostedService
{
    private static readonly HttpClient _httpClient = new HttpClient(
        new SocketsHttpHandler { PooledConnectionLifetime = TimeSpan.FromMinutes(10) }
    );

    private Uri? _metadataAddress;
    private Uri? _tokenEndpoint;
    private string? _audience;

    private string? _currentToken;

    public string CurrentToken
    {
        get
        {
            var token = Volatile.Read(ref _currentToken);
            return token ?? throw new InvalidOperationException("Maskinporten token not yet acquired");
        }
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        var firstTcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        _ = Task.Run(() => Run(firstTcs, cancellationToken), cancellationToken);
        return firstTcs.Task;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task Run(TaskCompletionSource first, CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var token = await GetToken(stoppingToken);
                Volatile.Write(ref _currentToken, token);
                _logger.LogInformation("Acquired new Maskinporten token");
                first.TrySetResult();

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error acquiring Maskinporten token");
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }
    }

    private async Task<string> GetToken(CancellationToken cancellationToken = default)
    {
        await EnsureMetadataLoadedAsync(cancellationToken);
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

        return tokenResponse.AccessToken;
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

    private async ValueTask EnsureMetadataLoadedAsync(CancellationToken cancellationToken)
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
