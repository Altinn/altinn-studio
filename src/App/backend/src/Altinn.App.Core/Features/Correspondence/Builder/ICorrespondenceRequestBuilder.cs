using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Indicates that the <see cref="CorrespondenceRequestBuilder"/> instance is on the <see cref="CorrespondenceRequest.ResourceId"/> step.
/// </summary>
public interface ICorrespondenceRequestBuilderResourceId
{
    /// <summary>
    /// Sets the Resource Id for the correspondence.
    /// </summary>
    /// <param name="resourceId">The resource ID as registered in the Altinn Resource Registry</param>
    ICorrespondenceRequestBuilderSender WithResourceId(string resourceId);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceRequestBuilder"/> instance is on the <see cref="CorrespondenceRequest.Sender"/> step.
/// </summary>
public interface ICorrespondenceRequestBuilderSender
{
    /// <summary>
    /// Sets the sender of the correspondence.
    /// </summary>
    /// <param name="sender">The correspondence sender</param>
    ICorrespondenceRequestBuilderSendersReference WithSender(OrganisationNumber sender);

    /// <summary>
    /// Sets the sender of the correspondence.
    /// </summary>
    /// <param name="sender">A string representing a Norwegian organisation number (e.g. 991825827 or 0192:991825827)</param>
    ICorrespondenceRequestBuilderSendersReference WithSender(string sender);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceRequestBuilder"/> instance is on the <see cref="CorrespondenceRequest.SendersReference"/> step.
/// </summary>
public interface ICorrespondenceRequestBuilderSendersReference
{
    /// <summary>
    /// Sets the senders reference for the correspondence.
    /// </summary>
    /// <param name="sendersReference">The correspondence reference</param>
    ICorrespondenceRequestBuilderRecipients WithSendersReference(string sendersReference);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceRequestBuilder"/> instance is on the <see cref="CorrespondenceRequest.Recipients"/> step.
/// </summary>
public interface ICorrespondenceRequestBuilderRecipients
{
    /// <summary>
    /// <p>Adds a recipient to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.Recipients"/>.</p>
    /// </summary>
    /// <param name="recipient">A recipient</param>
    ICorrespondenceRequestBuilderContent WithRecipient(OrganisationOrPersonIdentifier recipient);

    /// <summary>
    /// <p>Adds a recipient to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.Recipients"/>.</p>
    /// </summary>
    /// <param name="organisation">A recipient</param>
    ICorrespondenceRequestBuilderContent WithRecipient(OrganisationNumber organisation);

    /// <summary>
    /// <p>Adds a recipient to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.Recipients"/>.</p>
    /// </summary>
    /// <param name="person">A recipient</param>
    ICorrespondenceRequestBuilderContent WithRecipient(NationalIdentityNumber person);

    /// <summary>
    /// <p>Adds a recipient to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.Recipients"/>.</p>
    /// </summary>
    /// <param name="recipient">A recipient: Either a Norwegian organisation number or national identity number</param>
    ICorrespondenceRequestBuilderContent WithRecipient(string recipient);

    /// <summary>
    /// <p>Adds recipients to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.Recipients"/>.</p>
    /// </summary>
    /// <param name="recipients">A list of recipients</param>
    ICorrespondenceRequestBuilderContent WithRecipients(IEnumerable<OrganisationOrPersonIdentifier> recipients);

    /// <summary>
    /// <p>Adds recipients to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.Recipients"/>.</p>
    /// </summary>
    /// <param name="recipients">A list of recipients: Either Norwegian organisation numbers or national identity numbers</param>
    ICorrespondenceRequestBuilderContent WithRecipients(IEnumerable<string> recipients);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceRequestBuilder"/> instance is on the <see cref="CorrespondenceRequest.Content"/> step.
/// </summary>
public interface ICorrespondenceRequestBuilderContent
{
    /// <summary>
    /// Sets the content of the correspondence.
    /// </summary>
    /// <param name="content">The correspondence content</param>
    ICorrespondenceRequestBuilder WithContent(CorrespondenceContent content);

    /// <summary>
    /// Sets the content of the correspondence.
    /// </summary>
    /// <param name="builder">A <see cref="CorrespondenceContentBuilder"/> instance in the <see cref="ICorrespondenceContentBuilder"/> stage</param>
    ICorrespondenceRequestBuilder WithContent(ICorrespondenceContentBuilder builder);

    /// <summary>
    /// Sets the content of the correspondence.
    /// </summary>
    /// <param name="language">The message language</param>
    /// <param name="title">The message title</param>
    /// <param name="summary">The message summary</param>
    /// <param name="body">The message body</param>
    ICorrespondenceRequestBuilder WithContent(
        LanguageCode<Iso6391> language,
        string title,
        string summary,
        string body
    );

    /// <summary>
    /// Sets the content of the correspondence.
    /// </summary>
    /// <param name="language">The message language in ISO 639-1 format</param>
    /// <param name="title">The message title</param>
    /// <param name="summary">The message summary</param>
    /// <param name="body">The message body</param>
    ICorrespondenceRequestBuilder WithContent(string language, string title, string summary, string body);
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceRequestBuilder"/> instance has completed all
/// required steps and can proceed to <see cref="CorrespondenceRequestBuilder.Build"/>.
/// </summary>
public interface ICorrespondenceRequestBuilder
    : ICorrespondenceRequestBuilderResourceId,
        ICorrespondenceRequestBuilderSender,
        ICorrespondenceRequestBuilderSendersReference,
        ICorrespondenceRequestBuilderRecipients,
        ICorrespondenceRequestBuilderContent
{
    /// <summary>
    /// Sets the date and time when the correspondence can be deleted from the system.
    /// </summary>
    /// <param name="allowSystemDeleteAfter">The point in time when the correspondence may be safely deleted</param>
    ICorrespondenceRequestBuilder WithAllowSystemDeleteAfter(DateTimeOffset allowSystemDeleteAfter);

    /// <summary>
    /// Sets due date and time for the correspondence.
    /// </summary>
    /// <param name="dueDateTime">The point in time when the correspondence is due</param>
    ICorrespondenceRequestBuilder WithDueDateTime(DateTimeOffset dueDateTime);

    /// <summary>
    /// Sets the requested publish time for the correspondence.
    /// </summary>
    /// <param name="requestedPublishTime">The point in time when the correspondence should be published</param>
    ICorrespondenceRequestBuilder WithRequestedPublishTime(DateTimeOffset requestedPublishTime);

    /// <summary>
    /// Set the message sender for the correspondence.
    /// </summary>
    /// <param name="messageSender">The name of the message sender</param>
    ICorrespondenceRequestBuilder WithMessageSender(string messageSender);

    /// <summary>
    /// <p>Adds an external reference to the correspondence.</p>
    /// <p>This method respects any existing references already stored in <see cref="CorrespondenceRequest.ExternalReferences"/>.</p>
    /// </summary>
    /// <param name="externalReference">A <see cref="CorrespondenceExternalReference"/> item</param>
    ICorrespondenceRequestBuilder WithExternalReference(CorrespondenceExternalReference externalReference);

    /// <summary>
    /// <p>Adds an external reference to the correspondence.</p>
    /// <p>This method respects any existing references already stored in <see cref="CorrespondenceRequest.ExternalReferences"/>.</p>
    /// </summary>
    /// <param name="type">The reference type to add</param>
    /// <param name="value">The reference value</param>
    ICorrespondenceRequestBuilder WithExternalReference(CorrespondenceReferenceType type, string value);

    /// <summary>
    /// <p>Adds external references to the correspondence.</p>
    /// <p>This method respects any existing references already stored in <see cref="CorrespondenceRequest.ExternalReferences"/>.</p>
    /// </summary>
    /// <param name="externalReferences">A list of <see cref="CorrespondenceExternalReference"/> items</param>
    ICorrespondenceRequestBuilder WithExternalReferences(
        IEnumerable<CorrespondenceExternalReference> externalReferences
    );

    /// <summary>
    /// <p>Sets the property list for the correspondence.</p>
    /// <p>This method respects any existing properties already stored in <see cref="CorrespondenceRequest.PropertyList"/>, but will overwrite entries with the same key.</p>
    /// </summary>
    /// <param name="propertyList">A key-value list of arbitrary properties to associate with the correspondence</param>
    ICorrespondenceRequestBuilder WithPropertyList(IReadOnlyDictionary<string, string> propertyList);

    /// <summary>
    /// <p>Adds a reply option to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.ReplyOptions"/>.</p>
    /// </summary>
    /// <param name="replyOption">A <see cref="CorrespondenceReplyOption"/> item</param>
    ICorrespondenceRequestBuilder WithReplyOption(CorrespondenceReplyOption replyOption);

    /// <summary>
    /// <p>Adds a reply option to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.ReplyOptions"/>.</p>
    /// </summary>
    /// <param name="linkUrl">The URL to be used as a reply/response to a correspondence</param>
    /// <param name="linkText">The text to display for the link</param>
    ICorrespondenceRequestBuilder WithReplyOption(string linkUrl, string linkText);

    /// <summary>
    /// <p>Adds reply options to the correspondence.</p>
    /// <p>This method respects any existing options already stored in <see cref="CorrespondenceRequest.ReplyOptions"/>.</p>
    /// </summary>
    /// <param name="replyOptions">A list of <see cref="CorrespondenceReplyOption"/> items</param>
    ICorrespondenceRequestBuilder WithReplyOptions(IEnumerable<CorrespondenceReplyOption> replyOptions);

    /// <summary>
    /// Sets the notification for the correspondence.
    /// </summary>
    /// <param name="notification">The notification details to be associated with the correspondence</param>
    ICorrespondenceRequestBuilder WithNotification(CorrespondenceNotification notification);

    /// <summary>
    /// Sets the notification for the correspondence if configured. Skips if <c>null</c>.
    /// </summary>
    /// <param name="notification">The notification details to be associated with the correspondence</param>
    ICorrespondenceRequestBuilder WithNotificationIfConfigured(CorrespondenceNotification? notification);

    /// <summary>
    /// Sets the notification for the correspondence.
    /// </summary>
    /// <param name="builder">A <see cref="CorrespondenceNotificationBuilder"/> instance in the <see cref="ICorrespondenceNotificationBuilder"/> stage</param>
    ICorrespondenceRequestBuilder WithNotification(ICorrespondenceNotificationBuilder builder);

    /// <summary>
    /// Sets whether the correspondence can override reservation against digital communication in KRR.
    /// </summary>
    /// <param name="ignoreReservation">A boolean value indicating if reservations can be ignored or not</param>
    ICorrespondenceRequestBuilder WithIgnoreReservation(bool ignoreReservation);

    /// <summary>
    /// Sets whether reading the correspondence needs to be confirmed by the recipient.
    /// </summary>
    /// <param name="isConfirmationNeeded">A boolean value indicating if confirmation is needed or not</param>
    ICorrespondenceRequestBuilder WithIsConfirmationNeeded(bool isConfirmationNeeded);

    /// <summary>
    /// <p>Adds an existing attachment reference to the correspondence.</p>
    /// <p>This method respects any existing references already stored in <see cref="CorrespondenceRequest.ExistingAttachments"/>.</p>
    /// </summary>
    /// <param name="existingAttachment">A <see cref="Guid"/> item pointing to an existing attachment</param>
    ICorrespondenceRequestBuilder WithExistingAttachment(Guid existingAttachment);

    /// <summary>
    /// <p>Adds existing attachment references to the correspondence.</p>
    /// <p>This method respects any existing references already stored in <see cref="CorrespondenceRequest.ExistingAttachments"/>.</p>
    /// </summary>
    /// <param name="existingAttachments">A list of <see cref="Guid"/> items pointing to existing attachments</param>
    ICorrespondenceRequestBuilder WithExistingAttachments(IEnumerable<Guid> existingAttachments);

    /// <summary>
    /// <p>Adds an attachment to the correspondence.</p>
    /// <p>This method respects any existing attachments already stored in <see cref="CorrespondenceContent.Attachments"/>.</p>
    /// </summary>
    /// <param name="attachment">A <see cref="CorrespondenceAttachment"/> item</param>
    ICorrespondenceRequestBuilder WithAttachment(CorrespondenceAttachment attachment);

    /// <summary>
    /// <p>Adds an attachment to the correspondence.</p>
    /// <p>This method respects any existing attachments already stored in <see cref="CorrespondenceContent.Attachments"/>.</p>
    /// </summary>
    /// <param name="builder">A <see cref="CorrespondenceAttachmentBuilder"/> instance in the <see cref="ICorrespondenceAttachmentBuilder"/> stage</param>
    ICorrespondenceRequestBuilder WithAttachment(ICorrespondenceAttachmentBuilder builder);

    /// <summary>
    /// <p>Adds attachments to the correspondence.</p>
    /// <p>This method respects any existing attachments already stored in <see cref="CorrespondenceContent.Attachments"/>.</p>
    /// </summary>
    /// <param name="attachments">A List of <see cref="CorrespondenceAttachment"/> items</param>
    ICorrespondenceRequestBuilder WithAttachments(IEnumerable<CorrespondenceAttachment> attachments);

    /// <summary>
    /// Builds the <see cref="CorrespondenceRequest"/> instance.
    /// </summary>
    CorrespondenceRequest Build();
}
