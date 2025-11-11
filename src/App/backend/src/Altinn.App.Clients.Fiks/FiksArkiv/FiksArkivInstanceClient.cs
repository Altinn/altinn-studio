using System.Net.Http.Headers;
using System.Net.Mime;
using System.Text;
using Altinn.App.Api.Models;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivInstanceClient : IFiksArkivInstanceClient
{
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;
    private readonly Telemetry? _telemetry;
    private readonly PlatformSettings _platformSettings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly GeneralSettings _generalSettings;
    private readonly ILogger<FiksArkivInstanceClient> _logger;

    private readonly AuthenticationMethod _serviceOwnerAuth = AuthenticationMethod.ServiceOwner();

    public FiksArkivInstanceClient(
        IOptions<PlatformSettings> platformSettings,
        IOptions<GeneralSettings> generalSettings,
        IAuthenticationTokenResolver authenticationTokenResolver,
        IHttpClientFactory httpClientFactory,
        IAppMetadata appMetadata,
        IAccessTokenGenerator accessTokenGenerator,
        ILogger<FiksArkivInstanceClient> logger,
        Telemetry? telemetry = null
    )
    {
        _platformSettings = platformSettings.Value;
        _generalSettings = generalSettings.Value;
        _telemetry = telemetry;
        _authenticationTokenResolver = authenticationTokenResolver;
        _httpClientFactory = httpClientFactory;
        _appMetadata = appMetadata;
        _accessTokenGenerator = accessTokenGenerator;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _authenticationTokenResolver.GetAccessToken(_serviceOwnerAuth, cancellationToken);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Failed to retrieve service owner token for FiksArkivInstanceClient: {Error}",
                e.Message
            );
            throw new FiksArkivException($"Error retrieving service owner token: {e.Message}", e);
        }
    }

    /// <inheritdoc />
    public async Task<Instance> GetInstance(
        InstanceIdentifier instanceIdentifier,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartGetInstanceByGuidActivity(instanceIdentifier.InstanceGuid);

        using HttpClient client = await GetAuthenticatedClient(HttpClientTarget.Storage);
        HttpResponseMessage response = await client.GetAsync($"instances/{instanceIdentifier}", cancellationToken);

        var deserializeResponse = await DeserializeResponse<Instance>(response);
        response.Dispose();

        return deserializeResponse;
    }

    /// <inheritdoc />
    public async Task ProcessMoveNext(
        InstanceIdentifier instanceIdentifier,
        string? action = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartApiProcessNextActivity(instanceIdentifier);

        try
        {
            using HttpClient client = await GetAuthenticatedClient(HttpClientTarget.App);
            using StringContent payload = GetProcessNextAction(action);
            HttpResponseMessage response = await client.PutAsync(
                $"instances/{instanceIdentifier}/process/next",
                payload,
                cancellationToken
            );

            await EnsureSuccessStatusCode(response);
            response.Dispose();

            _logger.LogInformation("Moved instance {InstanceId} to next step.", instanceIdentifier);
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to move instance {InstanceId} to next step: {Error}", instanceIdentifier, e);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task MarkInstanceComplete(
        InstanceIdentifier instanceIdentifier,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartApiProcessCompleteActivity(instanceIdentifier);

        try
        {
            using HttpClient client = await GetAuthenticatedClient(HttpClientTarget.Storage);
            using StringContent payload = new(string.Empty);
            HttpResponseMessage response = await client.PostAsync(
                $"instances/{instanceIdentifier}/complete",
                payload,
                cancellationToken
            );

            await EnsureSuccessStatusCode(response);
            response.Dispose();

            _logger.LogInformation("Marked {InstanceId} as completed.", instanceIdentifier);
        }
        catch (Exception e)
        {
            _logger.LogError("Failed to mark instance {InstanceId} as completed: {Error}", instanceIdentifier, e);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<DataElement> InsertBinaryData<TContent>(
        InstanceIdentifier instanceIdentifier,
        string dataType,
        string contentType,
        string filename,
        TContent content,
        string? generatedFromTask = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartInsertBinaryDataActivity(instanceIdentifier.ToString());

        try
        {
            if (string.IsNullOrWhiteSpace(dataType))
                throw new FiksArkivException("Data type cannot be null or empty.");
            if (string.IsNullOrWhiteSpace(filename))
                throw new FiksArkivException("Filename cannot be null or empty.");
            if (contentType?.Contains('/') != true)
                throw new FiksArkivException("Content type must be a valid MIME type.");

            string url = $"instances/{instanceIdentifier}/data?dataType={dataType}";
            if (!string.IsNullOrEmpty(generatedFromTask))
                url += $"&generatedFromTask={generatedFromTask}";

            HttpContent payload = content switch
            {
                byte[] bytes => new ByteArrayContent(bytes),
                ReadOnlyMemory<byte> memory => new ByteArrayContent(memory.ToArray()),
                Stream stream => new StreamContent(stream),
                _ => throw new FiksArkivException(
                    $"Unsupported content type: {typeof(TContent).Name}. Expected byte[] or Stream."
                ),
            };

            payload.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
            payload.Headers.ContentDisposition = new ContentDispositionHeaderValue(DispositionTypeNames.Attachment)
            {
                FileName = filename,
                FileNameStar = filename,
            };

            using HttpClient client = await GetAuthenticatedClient(HttpClientTarget.Storage);
            HttpResponseMessage response = await client.PostAsync(url, payload, cancellationToken);

            var deserializeResponse = await DeserializeResponse<DataElement>(response);

            response.Dispose();
            if (payload is ByteArrayContent)
                payload.Dispose();

            return deserializeResponse;
        }
        catch (Exception e)
        {
            _logger.LogError("Error storing binary data for instance {InstanceId}: {Error}", instanceIdentifier, e);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task DeleteBinaryData(
        InstanceIdentifier instanceIdentifier,
        Guid dataElementGuid,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = _telemetry?.StartDeleteDataActivity(
            instanceIdentifier.InstanceGuid,
            instanceIdentifier.InstanceOwnerPartyId
        );

        try
        {
            string url = $"instances/{instanceIdentifier}/data/{dataElementGuid}";

            using HttpClient client = await GetAuthenticatedClient(HttpClientTarget.Storage);
            HttpResponseMessage response = await client.DeleteAsync(url, cancellationToken);

            await EnsureSuccessStatusCode(response);
            response.Dispose();

            _logger.LogInformation(
                "Successfully deleted data element {DataElementId} for {InstanceId}.",
                dataElementGuid,
                instanceIdentifier
            );
        }
        catch (Exception e)
        {
            _logger.LogError(
                "Error deleting data element {DataElementId} for {InstanceId}: {Error}",
                dataElementGuid,
                instanceIdentifier,
                e
            );
            throw;
        }
    }

    private static async Task<T> DeserializeResponse<T>(HttpResponseMessage response)
    {
        await EnsureSuccessStatusCode(response);
        string content = await response.Content.ReadAsStringAsync();

        T? deserializedContent;
        try
        {
            deserializedContent = JsonConvert.DeserializeObject<T>(content);
        }
        catch (Exception e)
        {
            throw new PlatformHttpException(
                response,
                $"Error deserializing JSON data: {e.Message}. The content was: {content}",
                e
            );
        }

        return deserializedContent ?? throw GetPlatformHttpException(response, content);
    }

    private static async Task EnsureSuccessStatusCode(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode)
            return;

        string content = await response.Content.ReadAsStringAsync();
        throw GetPlatformHttpException(response, content);
    }

    private static PlatformHttpException GetPlatformHttpException(
        HttpResponseMessage response,
        string content,
        Exception? innerException = null
    )
    {
        string errorMessage = $"{(int)response.StatusCode} {response.ReasonPhrase}: {content}";
        return new PlatformHttpException(response, errorMessage, innerException);
    }

    private async Task<HttpClient> GetAuthenticatedClient(HttpClientTarget target)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        string baseUrl = target switch
        {
            HttpClientTarget.App => _generalSettings.FormattedExternalAppBaseUrl(appMetadata.AppIdentifier),
            HttpClientTarget.Storage => _platformSettings.ApiStorageEndpoint,
            _ => throw new ArgumentOutOfRangeException(nameof(target), target, null),
        };

        HttpClient client = _httpClientFactory.CreateClient();
        client.BaseAddress = new Uri(baseUrl);
        client.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            await GetServiceOwnerToken()
        );
        client.DefaultRequestHeaders.Add(
            General.PlatformAccessTokenHeaderName,
            _accessTokenGenerator.GenerateAccessToken(appMetadata.AppIdentifier.Org, appMetadata.AppIdentifier.App)
        );

        return client;
    }

    private enum HttpClientTarget
    {
        App,
        Storage,
    }

    private static StringContent GetProcessNextAction(string? action)
    {
        if (string.IsNullOrWhiteSpace(action))
            return new StringContent(string.Empty);

        var payload = new ProcessNext { Action = action };

        return new StringContent(JsonConvert.SerializeObject(payload), Encoding.UTF8, "application/json");
    }
}
