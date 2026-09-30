using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Builder factory for creating <see cref="CorrespondenceRequest"/> objects.
/// </summary>
public class CorrespondenceRequestBuilder : ICorrespondenceRequestBuilder
{
    private string? _resourceId;
    private string? _sendersReference;
    private CorrespondenceContent? _content;
    private List<CorrespondenceAttachment>? _contentAttachments;
    private DateTimeOffset? _dueDateTime;
    private List<OrganizationOrPersonIdentifier>? _recipients;
    private DateTimeOffset? _requestedPublishTime;
    private string? _messageSender;
    private List<CorrespondenceExternalReference>? _externalReferences;
    private Dictionary<string, string>? _propertyList;
    private List<CorrespondenceReplyOption>? _replyOptions;
    private CorrespondenceNotification? _notification;
    private bool? _ignoreReservation;
    private bool? _isConfirmationNeeded;
    private bool? _isConfidential;
    private List<Guid>? _existingAttachments;
    private Guid? _idempotentKey;

    private CorrespondenceRequestBuilder() { }

    /// <summary>
    /// Creates a new <see cref="CorrespondenceRequestBuilder"/> instance.
    /// </summary>
    public static ICorrespondenceRequestBuilderResourceId Create() => new CorrespondenceRequestBuilder();

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderSendersReference WithResourceId(string resourceId)
    {
        BuilderUtils.NotNullOrEmpty(resourceId, "Resource ID cannot be empty");
        _resourceId = resourceId;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderRecipients WithSendersReference(string sendersReference)
    {
        BuilderUtils.NotNullOrEmpty(sendersReference, "Senders reference cannot be empty");
        _sendersReference = sendersReference;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderContent WithRecipient(OrganizationOrPersonIdentifier recipient)
    {
        BuilderUtils.NotNullOrEmpty(recipient, "Recipients cannot be empty");
        return WithRecipients([recipient]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderContent WithRecipient(OrganizationNumber organization)
    {
        BuilderUtils.NotNullOrEmpty(organization, "Recipients cannot be empty");
        return WithRecipients([OrganizationOrPersonIdentifier.Create(organization)]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderContent WithRecipient(NationalIdentityNumber person)
    {
        BuilderUtils.NotNullOrEmpty(person, "Recipients cannot be empty");
        return WithRecipients([OrganizationOrPersonIdentifier.Create(person)]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderContent WithRecipient(string recipient)
    {
        BuilderUtils.NotNullOrEmpty(recipient, "Recipients cannot be empty");
        return WithRecipients([recipient]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderContent WithRecipients(IEnumerable<string> recipients)
    {
        BuilderUtils.NotNullOrEmpty(recipients);
        return WithRecipients(recipients.Select(OrganizationOrPersonIdentifier.Parse));
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilderContent WithRecipients(IEnumerable<OrganizationOrPersonIdentifier> recipients)
    {
        BuilderUtils.NotNullOrEmpty(recipients, "Recipients cannot be empty");
        _recipients ??= [];
        _recipients.AddRange(recipients);
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithContent(CorrespondenceContent content)
    {
        BuilderUtils.NotNullOrEmpty(content, "Content cannot be empty");
        _content = content;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithContent(ICorrespondenceContentBuilder builder)
    {
        return WithContent(builder.Build());
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithContent(
        LanguageCode<Iso6391> language,
        string title,
        string summary,
        string body
    )
    {
        _content = new CorrespondenceContent
        {
            Title = title,
            Summary = summary,
            Body = body,
            Language = language,
        };
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithContent(string language, string title, string summary, string body)
    {
        _content = new CorrespondenceContent
        {
            Title = title,
            Summary = summary,
            Body = body,
            Language = LanguageCode<Iso6391>.Parse(language),
        };
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithDueDateTime(DateTimeOffset dueDateTime)
    {
        BuilderUtils.NotNullOrEmpty(dueDateTime, "DueDateTime cannot be empty");
        _dueDateTime = dueDateTime;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithRequestedPublishTime(DateTimeOffset requestedPublishTime)
    {
        _requestedPublishTime = requestedPublishTime;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithMessageSender(string messageSender)
    {
        _messageSender = messageSender;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithExternalReference(CorrespondenceExternalReference externalReference)
    {
        return WithExternalReferences([externalReference]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithExternalReference(CorrespondenceReferenceType type, string value)
    {
        return WithExternalReferences([
            new CorrespondenceExternalReference { ReferenceType = type, ReferenceValue = value },
        ]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithExternalReferences(
        IEnumerable<CorrespondenceExternalReference> externalReferences
    )
    {
        _externalReferences ??= [];
        _externalReferences.AddRange(externalReferences);
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithPropertyList(IReadOnlyDictionary<string, string> propertyList)
    {
        _propertyList ??= [];
        foreach (var (key, value) in propertyList)
        {
            _propertyList[key] = value;
        }

        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithReplyOption(CorrespondenceReplyOption replyOption)
    {
        return WithReplyOptions([replyOption]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithReplyOption(string linkUrl, string linkText)
    {
        return WithReplyOptions([new CorrespondenceReplyOption { LinkUrl = linkUrl, LinkText = linkText }]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithReplyOptions(IEnumerable<CorrespondenceReplyOption> replyOptions)
    {
        _replyOptions ??= [];
        _replyOptions.AddRange(replyOptions);
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithNotification(ICorrespondenceNotificationBuilder builder)
    {
        return WithNotification(builder.Build());
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithNotification(CorrespondenceNotification notification)
    {
        _notification = notification;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithNotificationIfConfigured(CorrespondenceNotification? notification)
    {
        return notification is not null ? WithNotification(notification) : this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithIgnoreReservation(bool ignoreReservation)
    {
        _ignoreReservation = ignoreReservation;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithIsConfirmationNeeded(bool isConfirmationNeeded)
    {
        _isConfirmationNeeded = isConfirmationNeeded;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithExistingAttachment(Guid existingAttachment)
    {
        return WithExistingAttachments([existingAttachment]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithExistingAttachments(IEnumerable<Guid> existingAttachments)
    {
        _existingAttachments ??= [];
        _existingAttachments.AddRange(existingAttachments);
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithAttachment(CorrespondenceAttachment attachment)
    {
        return WithAttachments([attachment]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithAttachment(ICorrespondenceAttachmentBuilder builder)
    {
        return WithAttachments([builder.Build()]);
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithAttachments(IEnumerable<CorrespondenceAttachment> attachments)
    {
        _contentAttachments ??= [];
        _contentAttachments.AddRange(attachments);
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithIsConfidential(bool isConfidential)
    {
        _isConfidential = isConfidential;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceRequestBuilder WithIdempotentKey(Guid idempotentKey)
    {
        _idempotentKey = idempotentKey;
        return this;
    }

    /// <inheritdoc/>
    public CorrespondenceRequest Build()
    {
        BuilderUtils.NotNullOrEmpty(_resourceId);
        BuilderUtils.NotNullOrEmpty(_sendersReference);
        BuilderUtils.NotNullOrEmpty(_content);
        BuilderUtils.NotNullOrEmpty(_recipients);

        return new CorrespondenceRequest
        {
            ResourceId = _resourceId,
            SendersReference = _sendersReference,
            Content = _content with { Attachments = _contentAttachments?.ToArray() },
            DueDateTime = _dueDateTime,
            Recipients = _recipients.ToArray(),
            RequestedPublishTime = _requestedPublishTime,
            MessageSender = _messageSender,
            ExternalReferences = _externalReferences?.ToArray(),
            PropertyList = _propertyList?.ToDictionary(),
            ReplyOptions = _replyOptions?.ToArray(),
            Notification = _notification,
            IgnoreReservation = _ignoreReservation,
            ExistingAttachments = _existingAttachments?.ToArray(),
            IdempotentKey = _idempotentKey,
            IsConfirmationNeeded = _isConfirmationNeeded,
            IsConfidential = _isConfidential,
        };
    }
}
