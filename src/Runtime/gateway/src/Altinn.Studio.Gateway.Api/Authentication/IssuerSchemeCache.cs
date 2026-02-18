using System.Collections.Frozen;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Authentication;

internal sealed class IssuerSchemeCache
{
    private FrozenDictionary<string, string>? _issuerToScheme;

    public void Initialize(FrozenDictionary<string, string> issuerToScheme) =>
        Interlocked.Exchange(ref _issuerToScheme, issuerToScheme);

    public bool TryGetScheme(string issuer, [NotNullWhen(true)] out string? scheme)
    {
        var lookup = Volatile.Read(ref _issuerToScheme);
        if (lookup is null)
        {
            scheme = null;
            return false;
        }

        return lookup.TryGetValue(issuer, out scheme);
    }
}

internal sealed class IssuerSchemeCacheInitializer(
    IssuerSchemeCache _cache,
    IOptionsMonitor<MaskinportenSettings> _settings,
    IHttpClientFactory _httpClientFactory,
    ILogger<IssuerSchemeCacheInitializer> _logger
) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(20));
        cancellationToken = cts.Token;

        var metadataAddresses = _settings.CurrentValue.MetadataAddresses;
        if (metadataAddresses.Length == 0)
            throw new InvalidOperationException("Maskinporten:MetadataAddresses must contain at least one address");

        var mapping = new Dictionary<string, string>(metadataAddresses.Length);
        using var httpClient = _httpClientFactory.CreateClient();

        for (var i = 0; i < metadataAddresses.Length; i++)
        {
            var metadataAddress = metadataAddresses[i];
            var schemeName = $"Maskinporten_{i}";

            var response = await httpClient.GetStringAsync(new Uri(metadataAddress), cancellationToken);
            using var doc = JsonDocument.Parse(response);

            if (!doc.RootElement.TryGetProperty("issuer", out var issuerElement))
                throw new InvalidOperationException(
                    $"OIDC metadata from {metadataAddress} does not contain 'issuer' property"
                );

            var issuer =
                issuerElement.GetString()
                ?? throw new InvalidOperationException(
                    $"OIDC metadata from {metadataAddress} has null 'issuer' property"
                );

            mapping[issuer] = schemeName;
            _logger.LogInformation("Mapped issuer {Issuer} to authentication scheme {Scheme}", issuer, schemeName);
        }

        _cache.Initialize(mapping.ToFrozenDictionary());
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
