using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using CorrespondenceResult = Altinn.App.Core.Features.Telemetry.Correspondence.CorrespondenceResult;

namespace Altinn.App.Core.Features.Correspondence;

/// <inheritdoc />
internal sealed class CorrespondenceClient : ICorrespondenceClient
{
    private readonly ILogger<CorrespondenceClient> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly PlatformSettings _platformSettings;
    private readonly Telemetry? _telemetry;

    private readonly CorrespondenceAuthorisationFactory _authorisationFactory;

    public CorrespondenceClient(
        IHttpClientFactory httpClientFactory,
        IOptions<PlatformSettings> platformSettings,
        IServiceProvider serviceProvider,
        ILogger<CorrespondenceClient> logger,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _platformSettings = platformSettings.Value;
        _telemetry = telemetry;
        _authorisationFactory = new CorrespondenceAuthorisationFactory(serviceProvider);
    }

    private async Task<JwtToken> AuthorisationResolver(CorrespondencePayloadBase payload)
    {
        if (payload.AccessTokenFactory is null && payload.AuthorisationMethod is null)
        {
            throw new CorrespondenceArgumentException(
                "Neither AccessTokenFactory nor AuthorisationMethod was provided in the CorrespondencePayload object"
            );
        }

        if (payload.AccessTokenFactory is not null)
        {
            return await payload.AccessTokenFactory();
        }

        return payload.AuthorisationMethod switch
        {
            CorrespondenceAuthorisation.Maskinporten => await _authorisationFactory.Maskinporten(),
            _ => throw new CorrespondenceArgumentException(
                $"Unknown CorrespondenceAuthorisation `{payload.AuthorisationMethod}`"
            ),
        };
    }

    /// <inheritdoc />
    public async Task<SendCorrespondenceResponse> Send(
        SendCorrespondencePayload payload,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Sending Correspondence request");
        using Activity? activity = _telemetry?.StartSendCorrespondenceActivity();

        try
        {
            using MultipartFormDataContent content = payload.CorrespondenceRequest.Serialise();
            using HttpRequestMessage request = await AuthenticatedHttpRequestFactory(
                method: HttpMethod.Post,
                uri: GetUri("correspondence/upload"),
                content: content,
                payload: payload
            );

            var response = await HandleServerCommunication<SendCorrespondenceResponse>(request, cancellationToken);
            activity?.SetCorrespondence(response);
            _telemetry?.RecordCorrespondenceOrder(CorrespondenceResult.Success);

            return response;
        }
        catch (CorrespondenceException e)
        {
            var requestException = e as CorrespondenceRequestException;

            _logger.LogError(
                e,
                "Failed to send correspondence: status={StatusCode} response={Response}",
                requestException?.HttpStatusCode.ToString() ?? "Unknown",
                requestException?.ResponseBody ?? "No response body"
            );

            activity?.Errored(e, requestException?.ProblemDetails?.Detail);
            _telemetry?.RecordCorrespondenceOrder(CorrespondenceResult.Error);
            throw;
        }
        catch (Exception e)
        {
            activity?.Errored(e);
            _logger.LogError(e, "Failed to send correspondence: {Exception}", e);
            _telemetry?.RecordCorrespondenceOrder(CorrespondenceResult.Error);
            throw new CorrespondenceRequestException($"Failed to send correspondence: {e}", e);
        }
    }

    /// <inheritdoc/>
    public async Task<GetCorrespondenceStatusResponse> GetStatus(
        GetCorrespondenceStatusPayload payload,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogDebug("Fetching correspondence status");
        using Activity? activity = _telemetry?.StartCorrespondenceStatusActivity(payload.CorrespondenceId);

        try
        {
            using HttpRequestMessage request = await AuthenticatedHttpRequestFactory(
                method: HttpMethod.Get,
                uri: GetUri($"correspondence/{payload.CorrespondenceId}/details"),
                content: null,
                payload: payload
            );

            return await HandleServerCommunication<GetCorrespondenceStatusResponse>(request, cancellationToken);
        }
        catch (CorrespondenceException e)
        {
            var requestException = e as CorrespondenceRequestException;

            _logger.LogError(
                e,
                "Failed to fetch correspondence status: status={StatusCode} response={Response}",
                requestException?.HttpStatusCode.ToString() ?? "Unknown",
                requestException?.ResponseBody ?? "No response body"
            );

            activity?.Errored(e, requestException?.ProblemDetails?.Detail);
            throw;
        }
        catch (Exception e)
        {
            activity?.Errored(e);
            _logger.LogError(e, "Failed to fetch correspondence status: {Exception}", e);
            throw new CorrespondenceRequestException($"Failed to fetch correspondence status: {e}", e);
        }
    }

    private async Task<HttpRequestMessage> AuthenticatedHttpRequestFactory(
        HttpMethod method,
        string uri,
        HttpContent? content,
        CorrespondencePayloadBase payload
    )
    {
        _logger.LogDebug("Fetching access token via factory");
        JwtToken accessToken = await AuthorisationResolver(payload);

        _logger.LogDebug("Constructing authorized http request for target uri {TargetEndpoint}", uri);
        HttpRequestMessage request = new(method, uri) { Content = content };

        request.Headers.Authorization = new AuthenticationHeaderValue(TokenTypes.Bearer, accessToken);
        request.Headers.TryAddWithoutValidation(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);

        return request;
    }

    private ProblemDetails? GetProblemDetails(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<ProblemDetails>(responseBody);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error parsing ProblemDetails from Correspondence api");
        }

        return null;
    }

    private string GetUri(string relativePath)
    {
        string baseUri = _platformSettings.ApiCorrespondenceEndpoint.TrimEnd('/');
        return $"{baseUri}/{relativePath.TrimStart('/')}";
    }

    private async Task<TContent> HandleServerCommunication<TContent>(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        using HttpClient client = _httpClientFactory.CreateClient();
        using HttpResponseMessage response = await client.SendAsync(request, cancellationToken);
        string responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (response.StatusCode != HttpStatusCode.OK)
        {
            var problemDetails = GetProblemDetails(responseBody);
            throw new CorrespondenceRequestException(
                $"Correspondence request failed with status {response.StatusCode}: {problemDetails?.Detail}",
                problemDetails,
                response.StatusCode,
                responseBody
            );
        }

        _logger.LogDebug("Correspondence request succeeded: {Response}", responseBody);

        try
        {
            return JsonSerializer.Deserialize<TContent>(responseBody)
                ?? throw new CorrespondenceRequestException(
                    "Literal null content received from Correspondence API server"
                );
        }
        catch (Exception e)
        {
            throw new CorrespondenceRequestException(
                $"Invalid response from Correspondence API server: {responseBody}",
                null,
                response.StatusCode,
                responseBody,
                e
            );
        }
    }
}
