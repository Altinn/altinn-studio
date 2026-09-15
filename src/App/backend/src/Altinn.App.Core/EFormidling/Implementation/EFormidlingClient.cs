using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Configuration;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.EFormidling.Models.SBD;
using Altinn.App.Core.Exceptions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Talks to the eFormidling integrasjonspunkt over HTTP. Internal because an app replaces the shipment
/// by implementing <see cref="IEFormidlingService"/>, not by substituting the transport.
/// </summary>
internal sealed class EFormidlingClient : IEFormidlingClient
{
    /// <summary>
    /// Every model property carries an explicit <c>JsonPropertyName</c>, so the naming policy never
    /// applies; web defaults are used for the case-insensitive reads, since the integrasjonspunkt's
    /// casing is not part of any contract we hold it to.
    /// </summary>
    private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _client;
    private readonly PlatformSettings _platformSettings;
    private readonly IAuthenticationTokenResolver _tokenResolver;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly IAppMetadata _appMetadata;
    private readonly Telemetry? _telemetry;

    public EFormidlingClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        ArgumentNullException.ThrowIfNull(httpClient);

        _tokenResolver = serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
        _accessTokenGenerator = serviceProvider.GetRequiredService<IAccessTokenGenerator>();
        _appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
        _telemetry = serviceProvider.GetService<Telemetry>();
        _platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;

        EFormidlingClientSettings settings = serviceProvider
            .GetRequiredService<IOptions<EFormidlingClientSettings>>()
            .Value;

        httpClient.BaseAddress = ResolveBaseAddress(settings.BaseUrl);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _client = httpClient;
    }

    /// <summary>
    /// A base address without a trailing slash silently drops its last path segment from every relative
    /// request, so the slash is appended rather than left to surprise whoever configured it.
    /// </summary>
    private static Uri ResolveBaseAddress(string? baseUrl)
    {
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new ConfigurationException(
                "eFormidling is registered but EFormidlingClientSettings.BaseUrl is not configured. "
                    + "Set it in the EFormidlingClientSettings configuration section, or through "
                    + "AddEFormidling().WithMetadata<T>().WithConfig(...)."
            );
        }

        string normalized = baseUrl.EndsWith('/') ? baseUrl : baseUrl + "/";
        if (!Uri.TryCreate(normalized, UriKind.Absolute, out Uri? baseAddress))
        {
            throw new ConfigurationException(
                $"EFormidlingClientSettings.BaseUrl is not a valid absolute URL: '{baseUrl}'."
            );
        }

        return baseAddress;
    }

    /// <inheritdoc/>
    public async Task<StandardBusinessDocument> CreateMessage(
        StandardBusinessDocument sbd,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(sbd);
        using Activity? activity = _telemetry?.StartEFormidlingCreateMessageActivity();

        string json = JsonSerializer.Serialize(sbd, _jsonOptions);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using HttpRequestMessage request = await CreateAppRequest(
            HttpMethod.Post,
            "messages/out",
            content,
            cancellationToken
        );
        using HttpResponseMessage response = await _client.SendAsync(request, cancellationToken);
        await EnsureSuccess(response, "create eFormidling message", cancellationToken);

        return await ReadJson<StandardBusinessDocument>(response, cancellationToken);
    }

    /// <inheritdoc/>
    public async Task UploadAttachment(
        Stream attachment,
        string messageId,
        string filename,
        CancellationToken cancellationToken = default
    )
    {
        ArgumentNullException.ThrowIfNull(attachment);
        ArgumentException.ThrowIfNullOrWhiteSpace(messageId);
        ArgumentException.ThrowIfNullOrWhiteSpace(filename);
        using Activity? activity = _telemetry?.StartEFormidlingUploadAttachmentActivity();

        using var content = new StreamContent(attachment);
        content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
        {
            Name = "attachment",
            FileName = filename,
            FileNameStar = filename,
        };
        content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

        string requestUri = $"messages/out/{Uri.EscapeDataString(messageId)}?title={Uri.EscapeDataString(filename)}";
        using HttpRequestMessage request = await CreateAppRequest(
            HttpMethod.Put,
            requestUri,
            content,
            cancellationToken
        );
        using HttpResponseMessage response = await _client.SendAsync(request, cancellationToken);
        await EnsureSuccess(response, $"upload eFormidling attachment '{filename}'", cancellationToken);
    }

    /// <inheritdoc/>
    public async Task SendMessage(string messageId, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(messageId);
        using Activity? activity = _telemetry?.StartEFormidlingSendMessageActivity();

        using HttpRequestMessage request = await CreateAppRequest(
            HttpMethod.Post,
            $"messages/out/{Uri.EscapeDataString(messageId)}",
            content: null,
            cancellationToken
        );
        using HttpResponseMessage response = await _client.SendAsync(request, cancellationToken);
        await EnsureSuccess(response, "send eFormidling message", cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<Statuses> GetMessageStatusById(string messageId, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(messageId);
        using Activity? activity = _telemetry?.StartEFormidlingGetMessageStatusActivity();

        using HttpRequestMessage request = CreateGatewayRequest(
            HttpMethod.Get,
            $"statuses?messageId={Uri.EscapeDataString(messageId)}"
        );
        using HttpResponseMessage response = await _client.SendAsync(request, cancellationToken);
        await EnsureSuccess(response, "read eFormidling message status", cancellationToken);

        return await ReadJson<Statuses>(response, cancellationToken);
    }

    /// <summary>
    /// A read through the platform gateway. Carries the subscription key alone.
    /// </summary>
    /// <remarks>
    /// The subscription key is not what admits the request — <c>GET statuses</c> was verified against
    /// tt02 to accept a request bearing no credentials whatsoever — but it identifies the app to the
    /// gateway's product, which the quota and rate limit are counted against. The tokens the shipment
    /// calls mint are deliberately skipped: nothing here reads them, and
    /// <see cref="IAccessTokenGenerator.GenerateAccessToken(string, string)"/> signs a certificate on
    /// every call, on a path the delivery wait polls repeatedly.
    /// </remarks>
    private HttpRequestMessage CreateGatewayRequest(HttpMethod method, string requestUri)
    {
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);
        return request;
    }

    /// <summary>
    /// An operation on the shipment. Carries the subscription key, the app's platform access token, and a
    /// service owner token.
    /// </summary>
    /// <remarks>
    /// Both tokens are required, and they are not independent. The gateway takes the
    /// <c>AltinnIntegrationPointToken</c> as the subject of an RFC 7662 introspection call to Altinn
    /// Authentication, and authenticates <em>that call</em> with whatever arrives in
    /// <c>Authorization</c>. An absent or unacceptable <c>Authorization</c> therefore fails the
    /// introspection, which the gateway reports as "requires a valid integration point access token" —
    /// naming the header that was fine. Verified against tt02: the subscription key plus both tokens
    /// reaches the integrasjonspunkt, and dropping either produces that same 401.
    /// <para>
    /// So the bearer has to be a token introspection accepts, which is why this resolves a service
    /// owner token rather than the current user's — a shipment runs from a workflow-engine callback,
    /// where there is no user to borrow one from.
    /// </para>
    /// </remarks>
    private async Task<HttpRequestMessage> CreateAppRequest(
        HttpMethod method,
        string requestUri,
        HttpContent? content,
        CancellationToken cancellationToken
    )
    {
        var request = new HttpRequestMessage(method, requestUri) { Content = content };
        request.Headers.Add(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        string platformAccessToken = _accessTokenGenerator.GenerateAccessToken(
            applicationMetadata.Org,
            applicationMetadata.AppIdentifier.App
        );

        JwtToken serviceOwnerToken = await _tokenResolver.GetAccessToken(
            AuthenticationMethod.ServiceOwner(),
            cancellationToken
        );

        request.Headers.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            serviceOwnerToken.Value
        );
        request.Headers.Add(General.EFormidlingAccessTokenHeaderName, platformAccessToken);

        return request;
    }

    private static async Task EnsureSuccess(
        HttpResponseMessage response,
        string operation,
        CancellationToken cancellationToken
    )
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        throw await PlatformHttpException.Create(
            response,
            $"The eFormidling integrasjonspunkt returned {(int)response.StatusCode} "
                + $"{response.StatusCode} for: {operation}.",
            cancellationToken: cancellationToken
        );
    }

    private static async Task<T> ReadJson<T>(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        Stream body = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using (body.ConfigureAwait(false))
        {
            T? value = await JsonSerializer.DeserializeAsync<T>(body, _jsonOptions, cancellationToken);
            return value
                ?? throw new JsonException(
                    $"The eFormidling integrasjonspunkt returned an empty or malformed {typeof(T).Name} response."
                );
        }
    }
}
