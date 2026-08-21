using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents and Altinn correspondence request.
/// </summary>
public sealed record CorrespondenceRequest
{
    /// <summary>
    /// The Resource ID for the correspondence service.
    /// </summary>
    public required string ResourceId { get; init; }

    /// <summary>
    /// A reference value given to the message by the creator.
    /// </summary>
    public required string SendersReference { get; init; }

    /// <summary>
    /// The content of the message.
    /// </summary>
    public required CorrespondenceContent Content { get; init; }

    /// <summary>
    /// When should the correspondence become visible to the recipient?
    /// If omitted, the correspondence is available immediately.
    /// </summary>
    public DateTimeOffset? RequestedPublishTime { get; init; }

    /// <summary>
    /// When must the recipient respond by?
    /// </summary>
    public DateTimeOffset? DueDateTime { get; init; }

    /// <summary>
    /// The recipients of the correspondence. Either Norwegian organization numbers or national identity numbers.
    /// </summary>
    public required IReadOnlyList<OrganizationOrPersonIdentifier> Recipients { get; init; }

    /// <summary>
    /// An alternative name for the sender of the correspondence. The name will be displayed instead of the organization name.
    /// </summary>
    public string? MessageSender { get; init; }

    /// <summary>
    /// Reference to other items in the Altinn ecosystem.
    /// </summary>
    public IReadOnlyList<CorrespondenceExternalReference>? ExternalReferences { get; init; }

    /// <summary>
    /// User-defined properties related to the correspondence.
    /// </summary>
    public IReadOnlyDictionary<string, string>? PropertyList { get; init; }

    /// <summary>
    /// Options for how the recipient can reply to the correspondence.
    /// </summary>
    public IReadOnlyList<CorrespondenceReplyOption>? ReplyOptions { get; init; }

    /// <summary>
    /// Notifications associated with this correspondence.
    /// </summary>
    public CorrespondenceNotification? Notification { get; init; }

    /// <summary>
    /// Specifies whether the correspondence can override reservation against digital communication in KRR.
    /// </summary>
    public bool? IgnoreReservation { get; init; }

    /// <summary>
    /// Specifies if reading the correspondence needs to be confirmed by the recipient.
    /// </summary>
    public bool? IsConfirmationNeeded { get; init; }

    /// <summary>
    /// Specifies whether the correspondence is confidential.
    /// </summary>
    public bool? IsConfidential { get; init; }

    /// <summary>
    /// Existing attachments that should be added to the correspondence.
    /// </summary>
    public IReadOnlyList<Guid>? ExistingAttachments { get; init; }

    /// <summary>
    /// An optional caller-chosen key that prevents the same correspondence being created twice.
    /// </summary>
    /// <remarks>
    /// <p>Reuse the same key when retrying a send that may already have succeeded — for example from a
    /// process step that can run more than once. Derive it from something stable about the send (the
    /// instance and the purpose, say), not from <see cref="Guid.NewGuid"/>, which would defeat it.</p>
    /// <p>This prevents duplicates rather than replaying the original result: a second send with the same
    /// key fails with <see cref="Exceptions.CorrespondenceRequestException"/> carrying
    /// <see cref="System.Net.HttpStatusCode.Conflict"/>, which a caller can treat as "already sent". It
    /// cannot be combined with more than one entry in <see cref="Recipients"/>, and it cannot be
    /// <see cref="Guid.Empty"/>; both are rejected before the request is sent.</p>
    /// <p>Named after the Correspondence API's own <c>idempotentKey</c> field.</p>
    /// </remarks>
    public Guid? IdempotentKey { get; init; }

    /// <summary>
    /// <p>Validates the state of the request based on some known requirements from the Correspondence API.</p>
    /// <p>Mostly stuff found here: https://github.com/Altinn/altinn-correspondence/blob/main/src/Altinn.Correspondence.Application/InitializeCorrespondences/InitializeCorrespondencesHandler.cs#L51.</p>
    /// </summary>
    internal void Validate()
    {
        if (Recipients.Count != Recipients.Distinct().Count())
            ValidationError($"Duplicate recipients found in {nameof(Recipients)} list");
        if (IdempotentKey == Guid.Empty)
            ValidationError($"{nameof(IdempotentKey)} cannot be an empty GUID");
        if (IdempotentKey is not null && Recipients.Count > 1)
            ValidationError(
                $"{nameof(IdempotentKey)} cannot be combined with more than one recipient, because the "
                    + "Correspondence API scopes the key to a single correspondence"
            );
        if (Notification is { OverrideRegisteredContactInformation: true, CustomRecipients: null or { Count: 0 } })
            ValidationError(
                $"{nameof(CorrespondenceNotification.OverrideRegisteredContactInformation)} requires at least one "
                    + $"entry in {nameof(CorrespondenceNotification.CustomRecipients)}, otherwise the notification "
                    + "would have no recipient at all"
            );
        if (IsConfirmationNeeded is true && DueDateTime is null)
            ValidationError($"When {nameof(IsConfirmationNeeded)} is set, {nameof(DueDateTime)} is also required");

        if (DueDateTime is not null)
        {
            var normalizedDueDate = NormalizeDateTime(DueDateTime.Value);
            if (normalizedDueDate < DateTimeOffset.UtcNow)
                ValidationError($"{nameof(DueDateTime)} cannot be a time in the past");
            if (normalizedDueDate < RequestedPublishTime)
                ValidationError($"{nameof(DueDateTime)} cannot be prior to {nameof(RequestedPublishTime)}");
        }
    }

    [DoesNotReturn]
    private static void ValidationError(string errorMessage)
    {
        throw new CorrespondenceArgumentException(errorMessage);
    }

    /// <summary>
    /// Removes the <see cref="DateTimeOffset.Ticks"/> portion of a <see cref="DateTimeOffset"/>.
    /// </summary>
    internal static DateTimeOffset NormalizeDateTime(DateTimeOffset dateTime)
    {
        return dateTime.AddTicks(-(dateTime.Ticks % TimeSpan.TicksPerSecond));
    }
}
