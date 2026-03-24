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
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

internal sealed class InstanceLockClient
{
    private readonly ILogger<InstanceLockClient> _logger;
    private readonly HttpClient _client;
    private readonly Telemetry? _telemetry;
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    private const string LockTokenHeaderName = "Altinn-Storage-Lock-Token";

    public InstanceLockClient(
        IOptions<PlatformSettings> platformSettings,
        ILogger<InstanceLockClient> logger,
        IAuthenticationTokenResolver authenticationTokenResolver,
        HttpClient httpClient,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _authenticationTokenResolver = authenticationTokenResolver;
        httpClient.BaseAddress = new Uri(platformSettings.Value.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.Value.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
        _telemetry = telemetry;
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

        using var response = await _client.PostAsync(token, apiUrl, content, cancellationToken: cancellationToken);

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
            _logger.LogError(e, "Error reading response from the lock acquisition endpoint.");
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

    public async Task ReleaseInstanceLock(
        Guid instanceGuid,
        int instanceOwnerPartyId,
        string lockToken,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartReleaseInstanceLockActivity(instanceGuid, instanceOwnerPartyId);
        string apiUrl = $"instances/{instanceOwnerPartyId}/{instanceGuid}/lock";
        var instanceLockRequest = new InstanceLockRequest { TtlSeconds = 0 };

        var userToken = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod,
            cancellationToken: cancellationToken
        );

        using HttpRequestMessage request = new(HttpMethod.Patch, apiUrl);
        request.Content = JsonContent.Create(instanceLockRequest);
        request.Headers.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, userToken);
        request.Headers.Add(LockTokenHeaderName, lockToken);

        using var response = await _client.SendAsync(request, cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw await PlatformHttpResponseSnapshotException.CreateAndDisposeHttpResponse(response, cancellationToken);
        }
    }
}
