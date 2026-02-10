using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;

public class NotificationOrder
{
    [JsonPropertyName("idempotencyId")]
    public required string IdempotencyId { get; set; }

    [JsonPropertyName("recipient")]
    public required Recipient Recipient { get; set; }

    public static NotificationOrder Email(
        string idempotencyId,
        string senderEmailAddress,
        string emailAddress,
        string subject,
        string body,
        EmailContentType contentType = EmailContentType.Plain,
        SendingTime sendingTimePolicy = SendingTime.Anytime
    )
    {
        return new()
        {
            IdempotencyId = idempotencyId,
            Recipient = new()
            {
                RecipientEmail = new()
                {
                    EmailAddress = emailAddress,
                    EmailSettings = new()
                    {
                        SenderEmailAddress = senderEmailAddress,
                        Subject = subject,
                        Body = body,
                        ContentType = contentType,
                        SendingTimePolicy = sendingTimePolicy,
                    },
                },
            },
        };
    }

    public static NotificationOrder Sms(
        string idempotencyId,
        string sender,
        string phoneNumber,
        string body,
        SendingTime sendingTimePolicy = SendingTime.Anytime
    )
    {
        return new()
        {
            IdempotencyId = idempotencyId,
            Recipient = new()
            {
                RecipientSms = new()
                {
                    PhoneNumber = phoneNumber,
                    SmsSettings = new()
                    {
                        Sender = sender,
                        Body = body,
                        SendingTimePolicy = sendingTimePolicy,
                    },
                },
            },
        };
    }
}

public class Recipient
{
    [JsonPropertyName("recipientEmail")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RecipientEmail? RecipientEmail { get; set; }

    [JsonPropertyName("recipientSms")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RecipientSms? RecipientSms { get; set; }
}

public class RecipientEmail
{
    [JsonPropertyName("emailAddress")]
    public required string EmailAddress { get; set; }

    [JsonPropertyName("emailSettings")]
    public required EmailSettings EmailSettings { get; set; }
}

public class RecipientSms
{
    [JsonPropertyName("phoneNumber")]
    public required string PhoneNumber { get; set; }

    [JsonPropertyName("smsSettings")]
    public required SmsSettings SmsSettings { get; set; }
}

public class EmailSettings
{
    [JsonPropertyName("senderEmailAddress")]
    public required string SenderEmailAddress { get; set; }

    [JsonPropertyName("subject")]
    public required string Subject { get; set; }

    [JsonPropertyName("body")]
    public required string Body { get; set; }

    [JsonPropertyName("contentType")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public EmailContentType ContentType { get; set; }

    [JsonPropertyName("sendingTimePolicy")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public SendingTime SendingTimePolicy { get; set; }
}

public class SmsSettings
{
    [JsonPropertyName("sender")]
    public required string Sender { get; set; }

    [JsonPropertyName("body")]
    public required string Body { get; set; }

    [JsonPropertyName("sendingTimePolicy")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public SendingTime SendingTimePolicy { get; set; }
}

public enum EmailContentType
{
    Plain,
    Html,
}

public enum SendingTime
{
    Anytime,
    Daytime,
}
