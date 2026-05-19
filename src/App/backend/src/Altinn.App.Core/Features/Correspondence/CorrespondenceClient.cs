using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mime;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Correspondence.Models.Response;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using CorrespondenceResult = Altinn.App.Core.Features.Telemetry.Correspondence.CorrespondenceResult;
#pragma warning disable CS0618 // Type or member is obsolete

namespace Altinn.App.Core.Features.Correspondence;

/// <inheritdoc />
internal sealed class CorrespondenceClient : ICorrespondenceClient
{
    private readonly ILogger<CorrespondenceClient> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly PlatformSettings _platformSettings;
    private readonly Telemetry? _telemetry;
    private readonly CorrespondenceAuthorisationFactory _authorisationFactory;
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;

    public CorrespondenceClient(
        IHttpClientFactory httpClientFactory,
        IOptions<PlatformSettings> platformSettings,
        IServiceProvider serviceProvider,
        ILogger<CorrespondenceClient> logger,
        IAuthenticationTokenResolver authenticationTokenResolver,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _platformSettings = platformSettings.Value;
        _telemetry = telemetry;
        _authenticationTokenResolver = authenticationTokenResolver;
        _authorisationFactory = new CorrespondenceAuthorisationFactory(serviceProvider);
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
            var correspondenceRequest = payload.CorrespondenceRequest;
            correspondenceRequest.Validate();

            var initializedAttachments = await InitializeAndUploadAttachments(
                correspondenceRequest.Content.Attachments,
                correspondenceRequest.ResourceId,
                payload,
                cancellationToken
            );

            var initRequest = BuildInitializeCorrespondencesRequest(correspondenceRequest, initializedAttachments);
            var response = await InitializeCorrespondences(initRequest, payload, cancellationToken);
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
        _logger.LogDebug("Fetching correspondence status for {CorrespondenceId}", payload.CorrespondenceId);
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

    /// <summary>
    /// Initialises, uploads, and polls each attachment to Published status in parallel.
    /// Returns the attachment + assigned ID pairs in the original list order.
    /// </summary>
    private async Task<IReadOnlyList<(CorrespondenceAttachment Attachment, Guid Id)>> InitializeAndUploadAttachments(
        IReadOnlyList<CorrespondenceAttachment>? attachments,
        string resourceId,
        CorrespondencePayloadBase payload,
        CancellationToken cancellationToken
    )
    {
        if (attachments is null or { Count: 0 })
            return [];

        const int maxConcurrentUploads = 4;
        using var sem = new SemaphoreSlim(maxConcurrentUploads);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        return await Task.WhenAll(
            attachments.Select(
                async (attachment, _) =>
                {
                    await sem.WaitAsync(linkedCts.Token);
                    try
                    {
                        var attachmentId = await InitializeAttachment(
                            new InitializeAttachmentRequest
                            {
                                ResourceId = resourceId,
                                FileName = attachment.Filename,
                                IsEncrypted = attachment.IsEncrypted ?? false,
                                SendersReference = attachment.SendersReference,
                            },
                            payload,
                            linkedCts.Token
                        );

                        await UploadAttachmentData(attachmentId, attachment.Data, payload, linkedCts.Token);

                        await PollAttachmentUntilPublished(attachmentId, payload, linkedCts.Token);

                        return (attachment, attachmentId);
                    }
                    catch (Exception) when (!linkedCts.Token.IsCancellationRequested)
                    {
                        await linkedCts.CancelAsync();
                        throw;
                    }
                    finally
                    {
                        sem.Release();
                    }
                }
            )
        );
    }

    private async Task<Guid> InitializeAttachment(
        InitializeAttachmentRequest request,
        CorrespondencePayloadBase payload,
        CancellationToken cancellationToken
    )
    {
        using HttpRequestMessage httpRequest = await AuthenticatedHttpRequestFactory(
            method: HttpMethod.Post,
            uri: GetUri("attachment"),
            content: JsonContent.Create(request),
            payload: payload
        );
        return await HandleServerCommunication<Guid>(httpRequest, cancellationToken);
    }

    private async Task UploadAttachmentData(
        Guid attachmentId,
        Stream data,
        CorrespondencePayloadBase payload,
        CancellationToken cancellationToken
    )
    {
        var streamContent = new StreamContent(data);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(MediaTypeNames.Application.Octet);

        using HttpRequestMessage httpRequest = await AuthenticatedHttpRequestFactory(
            method: HttpMethod.Post,
            uri: GetUri($"attachment/{attachmentId}/upload"),
            content: streamContent,
            payload: payload
        );
        _ = await HandleServerCommunication<AttachmentOverviewResponse>(httpRequest, cancellationToken);
    }

    private async Task PollAttachmentUntilPublished(
        Guid attachmentId,
        CorrespondencePayloadBase payload,
        CancellationToken cancellationToken
    )
    {
        const int pollIntervalMs = 1_000;
        const int maxAttempts = 60;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            if (attempt > 0)
                await Task.Delay(pollIntervalMs, cancellationToken);

            var overview = await GetAttachmentOverview(attachmentId, payload, cancellationToken);

            switch (overview.Status)
            {
                case CorrespondenceAttachmentStatusResponse.Published:
                    return;
                case CorrespondenceAttachmentStatusResponse.Failed:
                case CorrespondenceAttachmentStatusResponse.Purged:
                    throw new CorrespondenceRequestException(
                        $"Attachment upload failed for {attachmentId}: {overview.Status} — {overview.StatusText}"
                    );
            }
        }

        throw new CorrespondenceRequestException(
            $"Attachment {attachmentId} did not reach Published status after {maxAttempts} attempts"
        );
    }

    private async Task<AttachmentOverviewResponse> GetAttachmentOverview(
        Guid attachmentId,
        CorrespondencePayloadBase payload,
        CancellationToken cancellationToken
    )
    {
        using HttpRequestMessage httpRequest = await AuthenticatedHttpRequestFactory(
            method: HttpMethod.Get,
            uri: GetUri($"attachment/{attachmentId}"),
            content: null,
            payload: payload
        );
        return await HandleServerCommunication<AttachmentOverviewResponse>(httpRequest, cancellationToken);
    }

    private async Task<SendCorrespondenceResponse> InitializeCorrespondences(
        InitializeCorrespondencesRequest request,
        CorrespondencePayloadBase payload,
        CancellationToken cancellationToken
    )
    {
        using HttpRequestMessage httpRequest = await AuthenticatedHttpRequestFactory(
            method: HttpMethod.Post,
            uri: GetUri("correspondence"),
            content: JsonContent.Create(request),
            payload: payload
        );
        return await HandleServerCommunication<SendCorrespondenceResponse>(httpRequest, cancellationToken);
    }

    private static InitializeCorrespondencesRequest BuildInitializeCorrespondencesRequest(
        CorrespondenceRequest request,
        IReadOnlyList<(CorrespondenceAttachment Attachment, Guid Id)> initializedAttachments
    )
    {
        var allExistingAttachments = initializedAttachments
            .Select(x => x.Id)
            .Concat(request.ExistingAttachments ?? [])
            .ToList();

        return new InitializeCorrespondencesRequest
        {
            Correspondence = new CorrespondenceDetailsRequest
            {
                ResourceId = request.ResourceId,
                Sender = request.Sender.ToUrnFormattedString(),
                SendersReference = request.SendersReference,
                MessageSender = request.MessageSender,
                Content = BuildCorrespondenceContent(request.Content),
                RequestedPublishTime = request.RequestedPublishTime,
                DueDateTime = request.DueDateTime,
                ExternalReferences = request.ExternalReferences,
                PropertyList = request.PropertyList ?? new Dictionary<string, string>(),
                ReplyOptions = request.ReplyOptions,
                Notification = request.Notification is null
                    ? null
                    : BuildCorrespondenceNotification(request.Notification),
                IgnoreReservation = request.IgnoreReservation,
                IsConfirmationNeeded = request.IsConfirmationNeeded ?? false,
                IsConfidential = request.IsConfidential ?? false,
            },
            Recipients = request.Recipients.Select(r => r.ToUrnFormattedString()).ToList(),
            ExistingAttachments = allExistingAttachments.Count > 0 ? allExistingAttachments : [],
        };
    }

    private static CorrespondenceContentRequest BuildCorrespondenceContent(CorrespondenceContent content)
    {
        return new CorrespondenceContentRequest
        {
            Language = content.Language.Value,
            MessageTitle = content.Title,
            MessageSummary = content.Summary,
            MessageBody = content.Body,
        };
    }

    private static CorrespondenceNotificationRequest BuildCorrespondenceNotification(
        CorrespondenceNotification notification
    )
    {
        return new CorrespondenceNotificationRequest
        {
            NotificationTemplate = notification.NotificationTemplate,
            EmailSubject = notification.EmailSubject,
            EmailBody = notification.EmailBody,
            SmsBody = notification.SmsBody,
            SendReminder = notification.SendReminder ?? false,
            ReminderEmailSubject = notification.ReminderEmailSubject,
            ReminderEmailBody = notification.ReminderEmailBody,
            ReminderSmsBody = notification.ReminderSmsBody,
            NotificationChannel = notification.NotificationChannel,
            ReminderNotificationChannel = notification.ReminderNotificationChannel,
            SendersReference = notification.SendersReference,
            CustomRecipient = notification.CustomRecipient is null
                ? null
                : BuildNotificationRecipient(notification.CustomRecipient),
            CustomNotificationRecipients = notification
                .CustomNotificationRecipients?.Select(x => new CorrespondenceCustomNotificationRecipientRequest
                {
                    RecipientToOverride = x.RecipientToOverride.ToUrnFormattedString(),
                    Recipients = x.CorrespondenceNotificationRecipients.Select(BuildNotificationRecipient).ToList(),
                })
                .ToList(),
        };
    }

    private static CorrespondenceNotificationRecipientRequest BuildNotificationRecipient(
        CorrespondenceNotificationRecipient recipient
    )
    {
        return new CorrespondenceNotificationRecipientRequest
        {
            EmailAddress = recipient.EmailAddress,
            MobileNumber = recipient.MobileNumber,
            OrganizationNumber = recipient.OrganizationNumber?.ToUrnFormattedString(),
            NationalIdentityNumber = recipient.NationalIdentityNumber?.ToUrnFormattedString(),
        };
    }

    private async Task<HttpRequestMessage> AuthenticatedHttpRequestFactory(
        HttpMethod method,
        string uri,
        HttpContent? content,
        CorrespondencePayloadBase payload
    )
    {
        _logger.LogDebug("Fetching access token via factory");
        JwtToken accessToken = payload.AuthenticationMethod is not null
            ? await _authenticationTokenResolver.GetAccessToken(payload.AuthenticationMethod)
            : await _authorisationFactory.Resolve(payload);

        _logger.LogDebug("Constructing authorized http request for target uri {TargetEndpoint}", uri);
        HttpRequestMessage request = new(method, uri) { Content = content };

        request.Headers.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, accessToken);
        request.Headers.TryAddWithoutValidation(General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey);

        return request;
    }

    private ValidationProblemDetails? GetProblemDetails(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return null;
        }

        try
        {
            var problemDetails = JsonSerializer.Deserialize<ValidationProblemDetails>(responseBody);
            if (problemDetails is null)
            {
                return null;
            }

            problemDetails.Detail ??=
                problemDetails.Errors.Count > 0
                    ? JsonSerializer.Serialize(problemDetails.Errors)
                    : $"Unknown error. Full server response: {responseBody}";

            return problemDetails;
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
        client.Timeout = TimeSpan.FromHours(1);
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
