#nullable enable
namespace Altinn.Notifications.Core.Models.Notification
{
    /// <summary>
    /// An implementation of <see cref="INotificationSummary{TClass}"/> for email notifications"/>
    /// </summary>
    public class EmailNotificationSummary : INotificationSummary<EmailNotificationWithResult>
    {
        /// <inheritdoc/>  
        public Guid OrderId { get; set; }

        /// <inheritdoc/>  
        public string? SendersReference { get; set; }

        /// <inheritdoc/>  
        public int Generated { get; internal set; }

        /// <inheritdoc/>  
        public int Succeeded { get; internal set; }

        /// <inheritdoc/>  
        public List<EmailNotificationWithResult> Notifications { get; set; } = new List<EmailNotificationWithResult>();

        /// <summary>
        /// Initializes a new instance of the <see cref="EmailNotificationSummary"/> class.
        /// </summary>
        public EmailNotificationSummary(Guid orderId)
        {
            OrderId = orderId;
        }
    }
}
