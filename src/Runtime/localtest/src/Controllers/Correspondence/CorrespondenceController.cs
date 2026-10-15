using System.Net.Mime;
using System.Text.Json;
using System.Text.Json.Serialization;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Correspondence.Controllers;

/// <summary>
/// Emulates the Altinn Correspondence API an app calls to send messages, such as the signing call to action and
/// the receipt a signee gets. Apps reach it through <c>PlatformSettings__ApiCorrespondenceEndpoint</c>, which
/// studioctl points at <c>http://local.altinn.cloud:8000/correspondence/api/v1/</c>. A correspondence is
/// published as soon as it is created, and its notifications are worked out but not sent. Like the other
/// emulated platform services here, it performs no authentication or authorization.
/// </summary>
[ApiController]
[Route("correspondence/api")]
public class CorrespondenceController(
    LocalCorrespondenceRepository repository,
    CorrespondenceNotificationBuilder notificationBuilder
) : ControllerBase
{
    /// <summary>
    /// The organization a correspondence is sent from. Localtest serves one service owner, and uses the same
    /// organization number for it as elsewhere.
    /// </summary>
    internal const string SenderOrganizationNumber = "991825827";

    /// <summary>The organization that orders the notifications, when the caller's token does not say.</summary>
    private const string DefaultCreator = "ttd";

    /// <summary>How long an attachment is kept when the sender does not say.</summary>
    private const int DefaultAttachmentExpirationInDays = 365;

    /// <summary>The statuses a correspondence passes through on its way to the recipient, in order.</summary>
    private static readonly CorrespondenceStatus[] _publishingStatuses =
    [
        CorrespondenceStatus.Initialized,
        CorrespondenceStatus.ReadyForPublish,
        CorrespondenceStatus.Published,
    ];

    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly LocalCorrespondenceRepository _repository = repository;
    private readonly CorrespondenceNotificationBuilder _notificationBuilder = notificationBuilder;

    /// <summary>
    /// Creates and publishes one correspondence per recipient, with the notifications it orders.
    /// </summary>
    [HttpPost]
    [Route("v1/correspondence")]
    [Consumes(MediaTypeNames.Application.Json)]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(InitializeCorrespondencesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult> InitializeCorrespondences([FromBody] JsonElement body)
    {
        InitializeCorrespondencesRequestDto? request;
        try
        {
            request = body.Deserialize<InitializeCorrespondencesRequestDto>(_options);
        }
        catch (JsonException e)
        {
            return InvalidRequest(e.Message);
        }

        if (request is null)
        {
            return InvalidRequest("The request body is empty.");
        }
        if (Validate(request) is { } problem)
        {
            return InvalidRequest(problem);
        }

        IReadOnlyList<string> recipients = request.Recipients!;
        CorrespondenceRequestDto correspondence = request.Correspondence!;

        foreach (var attachmentId in request.ExistingAttachments ?? [])
        {
            var attachment = await _repository.FindAttachment(attachmentId);
            if (attachment?.Status != AttachmentStatus.Published)
            {
                return InvalidRequest($"Attachment {attachmentId} does not exist or has not been uploaded.");
            }
        }

        var created = DateTimeOffset.UtcNow;
        var stored = new List<StoredCorrespondence>();
        foreach (var recipient in recipients)
        {
            stored.Add(
                new StoredCorrespondence
                {
                    CorrespondenceId = Guid.NewGuid(),
                    IdempotentKey = request.IdempotentKey,
                    Recipient = recipient,
                    ResourceId = correspondence.ResourceId!,
                    SendersReference = correspondence.SendersReference!,
                    MessageSender = correspondence.MessageSender,
                    Status = CorrespondenceStatus.Published,
                    Created = created,
                    Published = created,
                    AttachmentIds = request.ExistingAttachments ?? [],
                    Notifications = await _notificationBuilder.Build(correspondence.Notification, recipient, created),
                    Request = body.Clone(),
                }
            );
        }

        if (!await _repository.TryCreate(request.IdempotentKey, stored))
        {
            return ProblemResult(
                StatusCodes.Status409Conflict,
                "A correspondence with the same idempotent key already exists",
                $"A correspondence with idempotent key {request.IdempotentKey} has already been created."
            );
        }

        return Ok(
            new InitializeCorrespondencesResponseDto
            {
                Correspondences =
                [
                    .. stored.Select(item => new CorrespondenceOverviewDto
                    {
                        CorrespondenceId = item.CorrespondenceId,
                        Status = item.Status,
                        Recipient = item.Recipient,
                        Notifications =
                        [
                            .. item.Notifications.Select(notification => new InitializedNotificationDto
                            {
                                OrderId = notification.OrderId,
                                IsReminder = notification.IsReminder,
                                Status = notification.Status,
                            }),
                        ],
                    }),
                ],
                AttachmentIds = request.ExistingAttachments ?? [],
            }
        );
    }

    /// <summary>
    /// Returns the details of a single correspondence, with its content, attachments and notifications.
    /// </summary>
    [HttpGet]
    [Route("v1/correspondence/{correspondenceId:guid}/details")]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(CorrespondenceDetailsResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetCorrespondenceDetails([FromRoute] Guid correspondenceId)
    {
        var correspondence = await _repository.Find(correspondenceId);
        if (correspondence is null)
        {
            return ProblemResult(
                StatusCodes.Status404NotFound,
                "Correspondence not found",
                $"No correspondence with id {correspondenceId} exists."
            );
        }

        var details = StoredRequest(correspondence);
        var attachments = new List<CorrespondenceAttachmentDto>();
        foreach (var attachmentId in correspondence.AttachmentIds)
        {
            if (await _repository.FindAttachment(attachmentId) is { } attachment)
            {
                attachments.Add(AttachmentDetails(attachment));
            }
        }

        string creator = HttpContext?.User.FindFirst("urn:altinn:org")?.Value ?? DefaultCreator;
        return Ok(
            new CorrespondenceDetailsResponseDto
            {
                CorrespondenceId = correspondence.CorrespondenceId,
                Recipient = correspondence.Recipient,
                ResourceId = correspondence.ResourceId,
                Sender = $"0192:{SenderOrganizationNumber}",
                SendersReference = correspondence.SendersReference,
                MessageSender = correspondence.MessageSender,
                Status = correspondence.Status,
                StatusText = correspondence.Status.ToString(),
                StatusChanged = correspondence.Published ?? correspondence.Created,
                Created = correspondence.Created,
                Published = correspondence.Published,
                StatusHistory =
                [
                    .. _publishingStatuses
                        .Where(status => status <= correspondence.Status)
                        .Select(status => new CorrespondenceStatusEventDto
                        {
                            Status = status,
                            StatusText = status.ToString(),
                            StatusChanged = correspondence.Created,
                        }),
                ],
                Content = new CorrespondenceContentResponseDto
                {
                    Language = details?.Content?.Language,
                    MessageTitle = details?.Content?.MessageTitle ?? string.Empty,
                    MessageSummary = details?.Content?.MessageSummary ?? string.Empty,
                    MessageBody = details?.Content?.MessageBody ?? string.Empty,
                    Attachments = attachments,
                },
                Notifications =
                [
                    .. correspondence.Notifications.Select(notification =>
                        NotificationOrder(notification, correspondence, creator, details?.IgnoreReservation)
                    ),
                ],
                RequestedPublishTime = details?.RequestedPublishTime,
                DueDateTime = details?.DueDateTime,
                PropertyList = details?.PropertyList,
                IgnoreReservation = details?.IgnoreReservation,
                IsConfirmationNeeded = details?.IsConfirmationNeeded ?? false,
                IsConfidential = details?.IsConfidential ?? false,
            }
        );
    }

    /// <summary>
    /// The correspondence part of the request a record was created from, or <c>null</c> when the stored request is
    /// in a shape this version of Localtest does not know, such as one an older Localtest stored.
    /// </summary>
    private static CorrespondenceRequestDto? StoredRequest(StoredCorrespondence correspondence)
    {
        try
        {
            return correspondence
                .Request.Deserialize<InitializeCorrespondencesRequestDto>(_options)
                ?.Correspondence;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// What the Correspondence API refuses before creating anything. Returns the reason, or <c>null</c> when the
    /// request is valid.
    /// </summary>
    private static string? Validate(InitializeCorrespondencesRequestDto request)
    {
        if (request.Recipients is not { Count: > 0 } recipients)
            return "The correspondence must have at least one recipient.";
        if (recipients.Any(string.IsNullOrWhiteSpace))
            return "A correspondence recipient cannot be empty.";
        if (recipients.Distinct(StringComparer.OrdinalIgnoreCase).Count() != recipients.Count)
            return "The recipients must be distinct.";
        if (request.IdempotentKey == Guid.Empty)
            return "The idempotent key cannot be an empty GUID.";
        if (request.IdempotentKey is not null && recipients.Count > 1)
            return "An idempotent key cannot be used when sending to multiple recipients.";

        if (request.Correspondence is not { } correspondence)
            return "The correspondence is missing.";
        if (string.IsNullOrWhiteSpace(correspondence.ResourceId))
            return "The correspondence must have a resource ID.";
        if (string.IsNullOrWhiteSpace(correspondence.SendersReference))
            return "The correspondence must have a senders reference.";
        if (
            correspondence.Content is not { } content
            || string.IsNullOrWhiteSpace(content.Language)
            || string.IsNullOrWhiteSpace(content.MessageTitle)
            || string.IsNullOrWhiteSpace(content.MessageBody)
        )
            return "The correspondence content must have a language, a message title and a message body.";
        if (correspondence.IsConfirmationNeeded && correspondence.DueDateTime is null)
            return "A correspondence that needs confirmation must have a due date.";

        return null;
    }

    private static NotificationOrderDto NotificationOrder(
        StoredNotification notification,
        StoredCorrespondence correspondence,
        string creator,
        bool? ignoreReservation
    )
    {
        NotificationSendStatusDto Sent(Guid id, NotificationRecipientDto recipient, string status) =>
            new()
            {
                Id = id,
                Succeeded = true,
                Recipient = recipient,
                SendStatus = new NotificationProcessingStatusDto
                {
                    Status = status,
                    Description = "Localtest does not send notifications. See them on the Localtest messages page.",
                    LastUpdate = notification.RequestedSendTime,
                },
            };

        var emails = notification.Emails.Select(email => Sent(email.Id, email.Recipient, "Delivered")).ToArray();
        var smses = notification.Smses.Select(sms => Sent(sms.Id, sms.Recipient, "Delivered")).ToArray();
        return new NotificationOrderDto
        {
            Id = notification.OrderId.ToString(),
            SendersReference = notification.SendersReference ?? correspondence.SendersReference,
            Creator = creator,
            Created = notification.Created,
            IsReminder = notification.IsReminder,
            NotificationChannel = notification.Channel,
            IgnoreReservation = ignoreReservation,
            ResourceId = correspondence.ResourceId,
            ProcessingStatus = new NotificationProcessingStatusDto
            {
                Status = "Completed",
                LastUpdate = notification.RequestedSendTime,
            },
            NotificationStatusDetails = new NotificationStatusDetailsDto
            {
                Email = emails.FirstOrDefault(),
                Sms = smses.FirstOrDefault(),
                Emails = emails,
                Smses = smses,
            },
        };
    }

    private static CorrespondenceAttachmentDto AttachmentDetails(StoredAttachment attachment) =>
        new()
        {
            Id = attachment.AttachmentId,
            Created = attachment.Created,
            Status = attachment.Status,
            StatusText = attachment.Status.ToString(),
            StatusChanged = attachment.StatusChanged,
            ExpirationTime = attachment.Created.AddDays(
                attachment.Request.ExpirationInDays ?? DefaultAttachmentExpirationInDays
            ),
            FileName = attachment.Request.FileName,
            IsEncrypted = attachment.Request.IsEncrypted,
            Checksum = attachment.Request.Checksum,
            SendersReference = attachment.Request.SendersReference ?? string.Empty,
            DataType = attachment.DataType,
        };

    private ActionResult InvalidRequest(string detail) =>
        ProblemResult(StatusCodes.Status400BadRequest, "Invalid request", detail);

    /// <summary>
    /// Initializes an attachment, which the app then uploads the data for and references from a correspondence.
    /// </summary>
    [HttpPost]
    [Route("v1/attachment")]
    [Consumes(MediaTypeNames.Application.Json)]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> InitializeAttachment([FromBody] InitializeAttachmentRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.ResourceId) || string.IsNullOrWhiteSpace(request.SendersReference))
        {
            return ProblemResult(
                StatusCodes.Status400BadRequest,
                "Invalid request",
                "An attachment must have a resource ID and a senders reference."
            );
        }

        var attachment = await _repository.CreateAttachment(request);
        return Ok(attachment.AttachmentId);
    }

    /// <summary>
    /// Uploads an attachment's data. The attachment is published right away, since Localtest does no malware scan.
    /// </summary>
    [HttpPost]
    [Route("v1/attachment/{attachmentId:guid}/upload")]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(AttachmentOverviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult> UploadAttachment(
        [FromRoute] Guid attachmentId,
        CancellationToken cancellationToken = default
    )
    {
        using var data = new MemoryStream();
        await Request.Body.CopyToAsync(data, cancellationToken);

        var (outcome, attachment) = await _repository.UploadAttachment(
            attachmentId,
            data.ToArray(),
            Request.ContentType
        );
        return outcome switch
        {
            AttachmentUploadOutcome.NotFound => AttachmentNotFound(attachmentId),
            AttachmentUploadOutcome.AlreadyUploaded => ProblemResult(
                StatusCodes.Status400BadRequest,
                "Invalid request",
                $"The data for attachment {attachmentId} has already been uploaded."
            ),
            _ => Ok(Overview(attachment!)),
        };
    }

    /// <summary>
    /// Returns an attachment's status.
    /// </summary>
    [HttpGet]
    [Route("v1/attachment/{attachmentId:guid}")]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(AttachmentOverviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetAttachmentOverview([FromRoute] Guid attachmentId)
    {
        var attachment = await _repository.FindAttachment(attachmentId);
        return attachment is null ? AttachmentNotFound(attachmentId) : Ok(Overview(attachment));
    }

    private static AttachmentOverviewDto Overview(StoredAttachment attachment) =>
        new()
        {
            AttachmentId = attachment.AttachmentId,
            Status = attachment.Status,
            StatusText = attachment.Status.ToString(),
            StatusChanged = attachment.StatusChanged,
            DataType = attachment.DataType,
            ResourceId = attachment.Request.ResourceId ?? string.Empty,
            FileName = attachment.Request.FileName,
            DisplayName = attachment.Request.DisplayName,
            IsEncrypted = attachment.Request.IsEncrypted,
            Checksum = attachment.Request.Checksum,
            SendersReference = attachment.Request.SendersReference ?? string.Empty,
            ExpirationInDays = attachment.Request.ExpirationInDays,
        };

    private ActionResult AttachmentNotFound(Guid attachmentId) =>
        ProblemResult(
            StatusCodes.Status404NotFound,
            "Attachment not found",
            $"No attachment with id {attachmentId} exists."
        );

    private ActionResult ProblemResult(int statusCode, string title, string detail) =>
        StatusCode(
            statusCode,
            new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail,
            }
        );
}
