using System.Text.Json.Serialization;

using Altinn.Notifications.Models;

namespace Altinn.Notifications.Core.Models.Notification
{
    /// <summary>
    /// EmailNotificationWithResultExt class
    /// </summary>
    public class EmailNotificationWithResultExt
    {
        /// <summary>
        /// The notification id
        /// </summary>
        [JsonPropertyName("id")]
        public Guid Id { get; set; }

        /// <summary>
        /// Boolean indicating if the sending of the notification was successful
        /// </summary>
        [JsonPropertyName("succeeded")]
        public bool Succeeded { get; set; }

        /// <summary>
        /// The recipient of the notification
        /// </summary>
        [JsonPropertyName("recipient")]
        public RecipientExt Recipient { get; set; } = new();

        /// <summary>
        /// The result status of the notification
        /// </summary>
        [JsonPropertyName("sendStatus")]
        public StatusExt SendStatus { get; set; } = new();
    }
}
