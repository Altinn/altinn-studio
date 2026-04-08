using System.Text.Json;
using Altinn.App.Core.Models.Notifications.Future;

namespace Altinn.App.Core.Tests.Features.Notifications.Order;

public class NotificationRecipientSerializationTests
{
    private static readonly JsonSerializerOptions _options = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Serialize_WithOnlyRecipientPerson_OmitsNullFields()
    {
        var recipient = new NotificationRecipient
        {
            RecipientPerson = new RecipientPerson
            {
                NationalIdentityNumber = "12345678901",
                EmailSettings = new EmailSendingOptions { Subject = "Test", Body = "Test body" },
            },
        };

        string json = JsonSerializer.Serialize(recipient, _options);
        using JsonDocument doc = JsonDocument.Parse(json);
        JsonElement root = doc.RootElement;

        Assert.True(root.TryGetProperty("recipientPerson", out _));
        Assert.False(root.TryGetProperty("recipientEmail", out _));
        Assert.False(root.TryGetProperty("recipientSms", out _));
        Assert.False(root.TryGetProperty("recipientOrganization", out _));
        Assert.False(root.TryGetProperty("recipientExternalIdentity", out _));
    }

    [Fact]
    public void Serialize_WithOnlyRecipientSelfIdentifiedUser_OmitsNullFields()
    {
        var recipient = new NotificationRecipient
        {
            RecipientExternalIdentity = new RecipientExternalIdentity
            {
                ExternalIdentity = "urn:altinn:person:idporten-email:test@example.com",
                EmailSettings = new EmailSendingOptions { Subject = "Test", Body = "Test body" },
            },
        };

        string json = JsonSerializer.Serialize(recipient, _options);
        using JsonDocument doc = JsonDocument.Parse(json);
        JsonElement root = doc.RootElement;

        Assert.True(root.TryGetProperty("recipientExternalIdentity", out _));
        Assert.False(root.TryGetProperty("recipientEmail", out _));
        Assert.False(root.TryGetProperty("recipientSms", out _));
        Assert.False(root.TryGetProperty("recipientPerson", out _));
        Assert.False(root.TryGetProperty("recipientOrganization", out _));
    }

    [Fact]
    public void Serialize_WithOnlyRecipientOrganization_OmitsNullFields()
    {
        var recipient = new NotificationRecipient
        {
            RecipientOrganization = new RecipientOrganization
            {
                OrgNumber = "991825827",
                ChannelSchema = NotificationChannel.Email,
                EmailSettings = new EmailSendingOptions { Subject = "Test", Body = "Test body" },
            },
        };

        string json = JsonSerializer.Serialize(recipient, _options);
        using JsonDocument doc = JsonDocument.Parse(json);
        JsonElement root = doc.RootElement;

        Assert.True(root.TryGetProperty("recipientOrganization", out _));
        Assert.False(root.TryGetProperty("recipientEmail", out _));
        Assert.False(root.TryGetProperty("recipientSms", out _));
        Assert.False(root.TryGetProperty("recipientPerson", out _));
        Assert.False(root.TryGetProperty("recipientExternalIdentity", out _));
    }
}
