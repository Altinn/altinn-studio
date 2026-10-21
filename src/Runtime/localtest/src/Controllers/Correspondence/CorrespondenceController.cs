using System.Net.Mime;
using System.Text.Json;
using System.Text.Json.Serialization;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace Altinn.Correspondence.Controllers;

/// <summary>
/// Emulates the Altinn Correspondence API an app calls to send messages, such as the signing call to action and
/// the receipt a signee gets. Apps reach it through <c>PlatformSettings__ApiCorrespondenceEndpoint</c>, which
/// studioctl points at <c>http://local.altinn.cloud:8000/correspondence/api/v1/</c>. A correspondence is
/// published as soon as it is created, and its notifications are worked out but not sent. It refuses what the
/// real API refuses based on the request alone, with the same error codes, and looks the recipients up in the
/// Localtest test data. It does not check the resource registry, access to the resource, the service owner
/// agreement or the contact reservation register, and like the other emulated platform services here, it
/// performs no authentication or authorization.
/// </summary>
[ApiController]
[Route("correspondence/api")]
public class CorrespondenceController(
    LocalCorrespondenceRepository repository,
    CorrespondenceNotificationBuilder notificationBuilder,
    ICorrespondenceRecipientRegister recipientRegister
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
    private readonly ICorrespondenceRecipientRegister _recipientRegister = recipientRegister;

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
            return ErrorResult(CorrespondenceErrors.Invalid(e.Message));
        }

        if (request is null)
        {
            return ErrorResult(CorrespondenceErrors.Invalid("The request body is empty."));
        }
        if (CorrespondenceRequestValidator.ValidateBeforeIdempotencyCheck(request) is { } malformed)
        {
            return ErrorResult(malformed);
        }
        // The real API answers a reused key before it validates the rest, so a retry that has since become invalid,
        // such as one whose due date has passed, still gets 409. TryCreate checks the key again under its lock.
        if (request.IdempotentKey is { } idempotentKey && await _repository.IdempotentKeyExists(idempotentKey))
        {
            return ErrorResult(CorrespondenceErrors.DuplicateInitCorrespondenceRequest);
        }
        if (CorrespondenceRequestValidator.Validate(request, DateTimeOffset.UtcNow) is { } invalid)
        {
            return ErrorResult(invalid);
        }

        IReadOnlyList<string> recipients = request.Recipients!;
        CorrespondenceRequestDto correspondence = request.Correspondence!;

        var unknownRecipients = new List<string>();
        foreach (var recipient in recipients)
        {
            var parsed = CorrespondenceRecipient.TryParse(recipient)!;
            if (parsed.IsRegisteredParty && !await _recipientRegister.Exists(parsed))
            {
                unknownRecipients.Add(parsed.Number!);
            }
        }
        if (unknownRecipients.Count > 0)
        {
            return ErrorResult(CorrespondenceErrors.RecipientLookupFailed(unknownRecipients));
        }

        foreach (var attachmentId in request.ExistingAttachments ?? [])
        {
            var attachment = await _repository.FindAttachment(attachmentId);
            if (attachment is null)
            {
                return ErrorResult(CorrespondenceErrors.ExistingAttachmentNotFound);
            }
            if (attachment.Status != AttachmentStatus.Published)
            {
                return ErrorResult(CorrespondenceErrors.AttachmentsNotPublished);
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
            return ErrorResult(CorrespondenceErrors.DuplicateInitCorrespondenceRequest);
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
            return ErrorResult(CorrespondenceErrors.CorrespondenceNotFound);
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
                    Language = details?.Content is { } content
                        ? CorrespondenceRequestValidator.LanguageOrDefault(content.Language)
                        : null,
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
        if (CorrespondenceRequestValidator.ValidateAttachment(request) is { } invalid)
        {
            return ErrorResult(invalid);
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
            AttachmentUploadOutcome.NotFound => ErrorResult(CorrespondenceErrors.AttachmentNotFound),
            AttachmentUploadOutcome.AlreadyUploaded => ErrorResult(
                CorrespondenceErrors.Invalid($"The data for attachment {attachmentId} has already been uploaded.")
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
        return attachment is null ? ErrorResult(CorrespondenceErrors.AttachmentNotFound) : Ok(Overview(attachment));
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

    /// <summary>
    /// The error as the Correspondence API answers it: problem details titled by the status, with the message as
    /// the detail and the error code, when there is one, as <c>errorCode</c>.
    /// </summary>
    private ObjectResult ErrorResult(CorrespondenceError error)
    {
        var problem = new ProblemDetails
        {
            Status = error.StatusCode,
            Title = ReasonPhrases.GetReasonPhrase(error.StatusCode),
            Detail = error.Message,
        };
        if (error.ErrorCode is { } code)
        {
            problem.Extensions["errorCode"] = code;
        }
        return StatusCode(error.StatusCode, problem);
    }
}
