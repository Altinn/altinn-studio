using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

internal sealed class InstanceLockClient(
    IOptionsMonitor<PlatformSettings> _platformSettings,
    IAuthenticationTokenResolver _authenticationTokenResolver,
    IHttpClientFactory _httpClientFactory,
    Telemetry? _telemetry = null
)
{
    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    private HttpClient CreateHttpClient()
    {
        var settings = _platformSettings.CurrentValue;
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.BaseAddress = new Uri(settings.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, settings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return httpClient;
    }

    public async Task<string> AcquireInstanceLock(
        Guid instanceGuid,
        int instanceOwnerPartyId,
        TimeSpan expiration,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartAcquireInstanceLockActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/lock";

        var token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cancellationToken
        );

        var request = new InstanceLockRequest { TtlSeconds = (int)expiration.TotalSeconds };
        var content = JsonContent.Create(request);

        using var client = CreateHttpClient();
        using var response = await client.PostAsync(token, apiUrl, content, cancellationToken: cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response, cancellationToken);
        }

        string? lockToken = null;
        try
        {
            var lockResponse = await response.Content.ReadFromJsonAsync<InstanceLockResponse>(
                cancellationToken: cancellationToken
            );
            lockToken = lockResponse?.LockToken;
        }
        catch (Exception e) when (e is JsonException || e is InvalidOperationException)
        {
            activity?.Errored(e, "Error reading response from the lock acquisition endpoint.");
        }

        if (string.IsNullOrEmpty(lockToken))
        {
            throw PlatformHttpResponseSnapshotException.Create(
                "The response from the lock acquisition endpoint was not expected.",
                response
            );
        }

        return lockToken;
    }

    public async Task UpdateInstanceLock(
        Guid instanceGuid,
        int instanceOwnerPartyId,
        string lockToken,
        TimeSpan ttl,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartUpdateInstanceLockActivity(instanceGuid, instanceOwnerPartyId, ttl);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/lock";
        var instanceLockRequest = new InstanceLockRequest { TtlSeconds = (int)ttl.TotalSeconds };

        var userToken = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cancellationToken
        );

        using HttpRequestMessage request = new(HttpMethod.Patch, apiUrl);
        request.Content = JsonContent.Create(instanceLockRequest);
        request.Headers.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, userToken);
        request.Headers.Add(General.LockTokenHeaderName, lockToken);

        using var client = CreateHttpClient();
        using var response = await client.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response, cancellationToken);
        }
    }
}
