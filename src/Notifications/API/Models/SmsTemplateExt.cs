using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models
{
    /// <summary>
    /// Template for an sms notification
    /// </summary>
    public class SmsTemplateExt
    {
        /// <summary>
        /// Gets the number from which the SMS is created by the template    
        /// </summary>
        [JsonPropertyName("senderNumber")]
        public string SenderNumber { get; set; } = string.Empty;

        /// <summary>
        /// Gets the body of SMSs created by the template    
        /// </summary>
        [JsonPropertyName("body")]
        public string Body { get; set; } = string.Empty;
    }
}
