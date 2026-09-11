using System.Net.Mime;
using System.Text.Json;
using System.Text.Json.Serialization;
using LocalTest.Services.Correspondence;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Correspondence.Controllers;

/// <summary>
/// Emulates the Altinn Correspondence API an app calls to send messages, for example the signing
/// "call to action" message. Apps reach it through <c>PlatformSettings__ApiCorrespondenceEndpoint</c>,
/// which studioctl points at <c>http://local.altinn.cloud:8000/correspondence/api/v1/</c>.
/// Like the other emulated platform services here, it performs no authentication or authorization.
/// </summary>
[ApiController]
[Route("correspondence/api")]
public class CorrespondenceController(LocalCorrespondenceRepository repository) : ControllerBase
{
    /// <summary>
    /// The status a freshly initialized correspondence has. The real service moves it on towards
    /// <c>Published</c> asynchronously; Localtest has no publisher and leaves it here.
    /// </summary>
    private const CorrespondenceStatus InitialStatus = CorrespondenceStatus.Initialized;

    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly LocalCorrespondenceRepository _repository = repository;

    /// <summary>
    /// Initializes one correspondence per recipient.
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
            return ProblemResult(StatusCodes.Status400BadRequest, "Invalid request", e.Message);
        }

        if (request?.Recipients is not { Count: > 0 } recipients)
        {
            return ProblemResult(
                StatusCodes.Status400BadRequest,
                "Invalid request",
                "The correspondence must have at least one recipient."
            );
        }

        if (request.IdempotentKey == Guid.Empty)
        {
            return ProblemResult(
                StatusCodes.Status400BadRequest,
                "Invalid request",
                "The idempotent key cannot be an empty GUID."
            );
        }

        if (request.IdempotentKey is not null && recipients.Count > 1)
        {
            return ProblemResult(
                StatusCodes.Status400BadRequest,
                "Invalid request",
                "An idempotent key cannot be used when sending to multiple recipients."
            );
        }

        var created = await _repository.TryCreate(request, body.Clone(), InitialStatus);
        if (created is null)
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
                Correspondences = created
                    .Select(correspondence => new CorrespondenceOverviewDto
                    {
                        CorrespondenceId = correspondence.CorrespondenceId,
                        Status = correspondence.Status,
                        Recipient = correspondence.Recipient,
                    })
                    .ToArray(),
            }
        );
    }

    /// <summary>
    /// Returns the details of a single correspondence.
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

        var details =
            correspondence.Request.ValueKind == JsonValueKind.Object
                ? correspondence
                    .Request.Deserialize<InitializeCorrespondencesRequestDto>(_options)
                    ?.Correspondence
                : null;

        return Ok(
            new CorrespondenceDetailsResponseDto
            {
                CorrespondenceId = correspondence.CorrespondenceId,
                Recipient = correspondence.Recipient,
                ResourceId = correspondence.ResourceId,
                SendersReference = correspondence.SendersReference,
                MessageSender = correspondence.MessageSender,
                Status = correspondence.Status,
                StatusText = correspondence.Status.ToString(),
                StatusChanged = correspondence.Created,
                Created = correspondence.Created,
                StatusHistory =
                [
                    new CorrespondenceStatusEventDto
                    {
                        Status = correspondence.Status,
                        StatusText = correspondence.Status.ToString(),
                        StatusChanged = correspondence.Created,
                    },
                ],
                Content = details?.Content,
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
    /// Attachments are not emulated. Signing sends none.
    /// </summary>
    [HttpPost]
    [Route("v1/attachment")]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status501NotImplemented)]
    public ActionResult InitializeAttachment() => AttachmentsNotSupported();

    /// <summary>
    /// Attachments are not emulated. Signing sends none.
    /// </summary>
    [HttpPost]
    [Route("v1/attachment/{attachmentId:guid}/upload")]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status501NotImplemented)]
    public ActionResult UploadAttachment([FromRoute] Guid attachmentId) =>
        AttachmentsNotSupported();

    /// <summary>
    /// Attachments are not emulated. Signing sends none.
    /// </summary>
    [HttpGet]
    [Route("v1/attachment/{attachmentId:guid}")]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status501NotImplemented)]
    public ActionResult GetAttachmentOverview([FromRoute] Guid attachmentId) =>
        AttachmentsNotSupported();

    private ActionResult AttachmentsNotSupported() =>
        ProblemResult(
            StatusCodes.Status501NotImplemented,
            "Attachments are not supported",
            "The local Correspondence API does not emulate attachments. Send a correspondence without attachments, or test attachments in a deployed environment."
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
