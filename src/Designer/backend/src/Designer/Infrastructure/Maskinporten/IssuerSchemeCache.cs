using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Infrastructure.Maskinporten;

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
    IssuerSchemeCache cache,
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    ILogger<IssuerSchemeCacheInitializer> logger
) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(20));
        cancellationToken = cts.Token;

        string[]? metadataAddresses = configuration
            .GetSection("Maskinporten:MetadataAddresses")
            .Get<string[]>();

        if (metadataAddresses is null || metadataAddresses.Length == 0)
        {
            throw new InvalidOperationException(
                "Maskinporten:MetadataAddresses configuration is required and must contain at least one address"
            );
        }

        var mapping = new Dictionary<string, string>(metadataAddresses.Length);
        using var httpClient = httpClientFactory.CreateClient();

        for (int i = 0; i < metadataAddresses.Length; i++)
        {
            string metadataAddress = metadataAddresses[i];
            string schemeName = $"Maskinporten_{i}";

            string response = await httpClient.GetStringAsync(
                new Uri(metadataAddress),
                cancellationToken
            );
            using var doc = JsonDocument.Parse(response);

            if (!doc.RootElement.TryGetProperty("issuer", out JsonElement issuerElement))
            {
                throw new InvalidOperationException(
                    $"OIDC metadata from {metadataAddress} does not contain 'issuer' property"
                );
            }

            string issuer =
                issuerElement.GetString()
                ?? throw new InvalidOperationException(
                    $"OIDC metadata from {metadataAddress} has null 'issuer' property"
                );

            mapping[issuer] = schemeName;
            logger.LogInformation(
                "Mapped issuer {Issuer} to authentication scheme {Scheme}",
                issuer,
                schemeName
            );
        }

        cache.Initialize(mapping.ToFrozenDictionary());
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
