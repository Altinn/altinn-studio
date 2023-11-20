#nullable enable
using Altinn.Notifications.Core.Enums;
using Altinn.Notifications.Core.Models.Recipients;

namespace Altinn.Notifications.Core.Models.Notification
{
    /// <summary>
    /// An implementation of <see cref="INotificationWithResult{TClass, T}"/> for email notifications"/>
    /// Using the <see cref="EmailRecipient"/> as recipient type and the <see cref="EmailNotificationResultType"/> as result type
    /// </summary>
    public class EmailNotificationWithResult : INotificationWithResult<EmailRecipient, EmailNotificationResultType>
    {
        /// <inheritdoc/>
        public Guid Id { get; }

        /// <inheritdoc/> 
        public bool Succeeded { get; internal set; }

        /// <inheritdoc/> 
        public EmailRecipient Recipient { get; }

        /// <inheritdoc/> 
        public NotificationResult<EmailNotificationResultType> ResultStatus { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="EmailNotificationWithResult"/> class.
        /// </summary>
        public EmailNotificationWithResult(Guid id, EmailRecipient recipient, NotificationResult<EmailNotificationResultType> result)
        {
            Id = id;
            Recipient = recipient;
            ResultStatus = result;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="EmailNotificationWithResult"/> class.
        /// </summary>
        internal EmailNotificationWithResult(Guid id, bool succeeded, EmailRecipient recipient, NotificationResult<EmailNotificationResultType> result)
        {
            Id = id;
            Succeeded = succeeded;
            Recipient = recipient;
            ResultStatus = result;
        }
    }
}
