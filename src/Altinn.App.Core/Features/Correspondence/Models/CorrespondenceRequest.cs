using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Correspondence.Exceptions;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a correspondence item that is serialisable as multipart form data.
/// </summary>
public abstract record MultipartCorrespondenceItem
{
    internal static void AddRequired(MultipartFormDataContent content, string value, string name)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new CorrespondenceArgumentException($"Required value is missing: {name}");

        content.Add(new StringContent(value), name);
    }

    internal static void AddRequired(MultipartFormDataContent content, DateTimeOffset value, string name)
    {
        if (value == default)
            throw new CorrespondenceArgumentException($"Required value is missing: {name}");

        var normalisedAndFormatted = NormaliseDateTime(value).ToString("O");
        content.Add(new StringContent(normalisedAndFormatted), name);
    }

    internal static void AddRequired(
        MultipartFormDataContent content,
        ReadOnlyMemory<byte> data,
        string name,
        string filename
    )
    {
        if (data.IsEmpty)
            throw new CorrespondenceArgumentException($"Required value is missing: {name}");

        content.Add(new ReadOnlyMemoryContent(data), name, filename);
    }

    internal static void AddIfNotNull(MultipartFormDataContent content, string? value, string name)
    {
        if (!string.IsNullOrWhiteSpace(value))
            content.Add(new StringContent(value), name);
    }

    internal static void OverrideIfAlreadyExists(MultipartFormDataContent content, string? value, string name)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            content.ReplaceByName(new StringContent(value), name);
        }
    }

    internal static void AddIfNotNull(MultipartFormDataContent content, DateTimeOffset? value, string name)
    {
        if (value is null)
            return;

        var normalisedAndFormatted = NormaliseDateTime(value.Value).ToString("O");
        content.Add(new StringContent(normalisedAndFormatted), name);
    }

    internal static void AddListItems<T>(
        MultipartFormDataContent content,
        IReadOnlyList<T>? items,
        Func<T, string> valueFactory,
        Func<int, string> keyFactory
    )
    {
        if (IsEmptyCollection(items))
            return;

        for (int i = 0; i < items.Count; i++)
        {
            string key = keyFactory.Invoke(i);
            string value = valueFactory.Invoke(items[i]);
            content.Add(new StringContent(value), key);
        }
    }

    internal static void SerializeListItems(
        MultipartFormDataContent content,
        IReadOnlyList<MultipartCorrespondenceListItem>? items
    )
    {
        if (IsEmptyCollection(items))
            return;

        for (int i = 0; i < items.Count; i++)
        {
            items[i].Serialise(content, i);
        }
    }

    internal static void SerializeOverrideNotificationRecipient(
        MultipartFormDataContent content,
        CorrespondenceNotificationRecipient notificationRecipient
    )
    {
        notificationRecipient.Serialise(content);
    }

    internal static void SerializeOverrideNotificationRecipients(
        MultipartFormDataContent content,
        IReadOnlyList<CorrespondenceNotificationRecipient>? notificationRecipients
    )
    {
        if (IsEmptyCollection(notificationRecipients))
            return;

        notificationRecipients[0].Serialise(content);
    }

    internal static void SerializeAttachmentItems(
        MultipartFormDataContent content,
        IReadOnlyList<CorrespondenceAttachment>? attachments
    )
    {
        if (IsEmptyCollection(attachments))
            return;

        // Ensure unique filenames
        var overrides = CalculateFilenameOverrides(attachments);

        // Serialise
        for (int i = 0; i < attachments.Count; i++)
        {
            attachments[i].Serialise(content, i, overrides.GetValueOrDefault(attachments[i]));
        }
    }

    internal static Dictionary<CorrespondenceAttachment, string> CalculateFilenameOverrides(
        IEnumerable<CorrespondenceAttachment> attachments
    )
    {
        var overrides = new Dictionary<CorrespondenceAttachment, string>(ReferenceEqualityComparer.Instance);
        var hasDuplicateFilenames = attachments
            .GroupBy(x => x.Filename.ToLowerInvariant())
            .Where(x => x.Count() > 1)
            .Select(x => x.ToList());

        foreach (var duplicates in hasDuplicateFilenames)
        {
            for (int i = 0; i < duplicates.Count; i++)
            {
                int uniqueId = i + 1;
                string filename = Path.GetFileNameWithoutExtension(duplicates[i].Filename);
                string extension = Path.GetExtension(duplicates[i].Filename);
                overrides.Add(duplicates[i], $"{filename}({uniqueId}){extension}");
            }
        }

        return overrides;
    }

    internal static void AddDictionaryItems<TKey, TValue>(
        MultipartFormDataContent content,
        IReadOnlyDictionary<TKey, TValue>? items,
        Func<TValue, string> valueFactory,
        Func<TKey, string> keyFactory
    )
    {
        if (IsEmptyCollection(items))
            return;

        foreach (var (dictKey, dictValue) in items)
        {
            string key = keyFactory.Invoke(dictKey);
            string value = valueFactory.Invoke(dictValue);
            content.Add(new StringContent(value), key);
        }
    }

    private static bool IsEmptyCollection<T>([NotNullWhen(false)] IReadOnlyCollection<T>? collection)
    {
        return collection is null || collection.Count == 0;
    }

    internal void ValidateAllProperties(string dataTypeName)
    {
        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(this);
        bool isValid = Validator.TryValidateObject(
            this,
            validationContext,
            validationResults,
            validateAllProperties: true
        );

        if (isValid is false)
        {
            throw new CorrespondenceArgumentException(
                $"Validation failed for {dataTypeName}",
                new AggregateException(validationResults.Select(x => new ValidationException(x.ErrorMessage)))
            );
        }
    }

    /// <summary>
    /// Removes the <see cref="DateTimeOffset.Ticks"/> portion of a <see cref="DateTimeOffset"/>.
    /// </summary>
    internal static DateTimeOffset NormaliseDateTime(DateTimeOffset dateTime)
    {
        return dateTime.AddTicks(-(dateTime.Ticks % TimeSpan.TicksPerSecond));
    }
}

/// <summary>
/// Represents a correspondence list item that is serialisable as multipart form data.
/// </summary>
public abstract record MultipartCorrespondenceListItem : MultipartCorrespondenceItem
{
    internal abstract void Serialise(MultipartFormDataContent content, int index);
}

/// <summary>
/// Represents and Altinn correspondence request.
/// </summary>
public sealed record CorrespondenceRequest : MultipartCorrespondenceItem
{
    /// <summary>
    /// The Resource ID for the correspondence service.
    /// </summary>
    public required string ResourceId { get; init; }

    /// <summary>
    /// The sending organisation of the correspondence.
    /// </summary>
    public required OrganisationNumber Sender { get; init; }

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
    /// When can Altinn remove the correspondence from its database?
    /// </summary>
    public required DateTimeOffset? AllowSystemDeleteAfter { get; init; }

    /// <summary>
    /// When must the recipient respond by?
    /// </summary>
    public DateTimeOffset? DueDateTime { get; init; }

    /// <summary>
    /// The recipients of the correspondence. Either Norwegian organisation numbers or national identity numbers.
    /// </summary>
    public required IReadOnlyList<OrganisationOrPersonIdentifier> Recipients { get; init; }

    /// <summary>
    /// An alternative name for the sender of the correspondence. The name will be displayed instead of the organisation name.
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
    /// Existing attachments that should be added to the correspondence.
    /// </summary>
    public IReadOnlyList<Guid>? ExistingAttachments { get; init; }

    /// <summary>
    /// Serialises the entire <see cref="CorrespondenceRequest"/> object to a provided <see cref="MultipartFormDataContent"/> instance.
    /// </summary>
    /// <param name="content">The multipart object to serialise into</param>
    internal void Serialise(MultipartFormDataContent content)
    {
        Validate();

        AddRequired(content, ResourceId, "Correspondence.ResourceId");
        AddRequired(content, Sender.ToUrnFormattedString(), "Correspondence.Sender");
        AddRequired(content, SendersReference, "Correspondence.SendersReference");
        AddIfNotNull(content, AllowSystemDeleteAfter, "Correspondence.AllowSystemDeleteAfter");
        AddIfNotNull(content, MessageSender, "Correspondence.MessageSender");
        AddIfNotNull(content, RequestedPublishTime, "Correspondence.RequestedPublishTime");
        AddIfNotNull(content, DueDateTime, "Correspondence.DueDateTime");
        AddIfNotNull(content, IgnoreReservation?.ToString(), "Correspondence.IgnoreReservation");
        AddIfNotNull(content, IsConfirmationNeeded?.ToString(), "Correspondence.IsConfirmationNeeded");
        AddDictionaryItems(content, PropertyList, x => x, key => $"Correspondence.PropertyList.{key}");
        AddListItems(content, ExistingAttachments, x => x.ToString(), i => $"Correspondence.ExistingAttachments[{i}]");
        AddListItems(content, Recipients, x => x.ToUrnFormattedString(), i => $"Recipients[{i}]");

        Content.Serialise(content);
        Notification?.Serialise(content);
        SerializeListItems(content, ExternalReferences);
        SerializeListItems(content, ReplyOptions);
    }

    /// <summary>
    /// Serialises the entire <see cref="CorrespondenceRequest"/> object to a newly created <see cref="MultipartFormDataContent"/>.
    /// </summary>
    internal MultipartFormDataContent Serialise()
    {
        var content = new MultipartFormDataContent();
        Serialise(content);
        return content;
    }

    /// <summary>
    /// <p>Validates the state of the request based on some known requirements from the Correspondence API.</p>
    /// <p>Mostly stuff found here: https://github.com/Altinn/altinn-correspondence/blob/main/src/Altinn.Correspondence.Application/InitializeCorrespondences/InitializeCorrespondencesHandler.cs#L51.</p>
    /// </summary>
    private void Validate()
    {
        if (Recipients.Count != Recipients.Distinct().Count())
            ValidationError($"Duplicate recipients found in {nameof(Recipients)} list");
        if (IsConfirmationNeeded is true && DueDateTime is null)
            ValidationError($"When {nameof(IsConfirmationNeeded)} is set, {nameof(DueDateTime)} is also required");

        DateTimeOffset? normalisedAllowSystemDeleteAfter = AllowSystemDeleteAfter is not null
            ? NormaliseDateTime(AllowSystemDeleteAfter.Value)
            : null;

        if (normalisedAllowSystemDeleteAfter is not null)
        {
            if (normalisedAllowSystemDeleteAfter.Value < DateTimeOffset.UtcNow)
                ValidationError($"{nameof(AllowSystemDeleteAfter)} cannot be a time in the past");
            if (normalisedAllowSystemDeleteAfter.Value < RequestedPublishTime)
                ValidationError($"{nameof(AllowSystemDeleteAfter)} cannot be prior to {nameof(RequestedPublishTime)}");
        }

        if (DueDateTime is not null)
        {
            var normalisedDueDate = NormaliseDateTime(DueDateTime.Value);
            if (normalisedDueDate < DateTimeOffset.UtcNow)
                ValidationError($"{nameof(DueDateTime)} cannot be a time in the past");
            if (normalisedDueDate < RequestedPublishTime)
                ValidationError($"{nameof(DueDateTime)} cannot be prior to {nameof(RequestedPublishTime)}");
            if (
                normalisedAllowSystemDeleteAfter is not null
                && normalisedAllowSystemDeleteAfter.Value < normalisedDueDate
            )
                ValidationError($"{nameof(AllowSystemDeleteAfter)} cannot be prior to {nameof(DueDateTime)}");
        }
    }

    [DoesNotReturn]
    private static void ValidationError(string errorMessage)
    {
        throw new CorrespondenceArgumentException(errorMessage);
    }
}
