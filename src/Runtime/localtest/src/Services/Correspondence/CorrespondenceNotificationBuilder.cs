using Altinn.Correspondence.Controllers;
using Altinn.Notifications.Core.Integrations;

namespace LocalTest.Services.Correspondence;

/// <summary>
/// Works out the notifications a correspondence orders, the way the Notifications service would: who gets an email
/// or an SMS, at which address, with which text. The addresses come from the recipient's contact information in
/// the Localtest test data, unless the correspondence names its own recipients. Nothing is sent.
/// </summary>
public sealed class CorrespondenceNotificationBuilder(IProfileClient profileClient, IRegisterClient registerClient)
{
    /// <summary>How long after the first notification Altinn sends the reminder.</summary>
    public static readonly TimeSpan ReminderDelay = TimeSpan.FromDays(7);

    internal const string GenericEmailSubject = "Du har mottatt en melding i Altinn";
    internal const string GenericEmailBody =
        "Du har mottatt en ny melding i innboksen din i Altinn. Logg inn på altinn.no for å lese den.";
    internal const string GenericSmsBody =
        "Du har mottatt en ny melding i Altinn. Logg inn på altinn.no for å lese den.";

    private const string OrganizationUrnPrefix = "urn:altinn:organization:identifier-no:";
    private const string PersonUrnPrefix = "urn:altinn:person:identifier-no:";

    /// <summary>
    /// The notification orders for one recipient's correspondence: the first notification, and a reminder when
    /// the request asks for one. None when the correspondence orders no notification.
    /// </summary>
    public async Task<IReadOnlyList<StoredNotification>> Build(
        NotificationRequestDto? request,
        string recipient,
        DateTimeOffset created
    )
    {
        if (request is null)
        {
            return [];
        }

        IReadOnlyList<ContactPoint> contacts = await ResolveContacts(request, recipient);
        var notifications = new List<StoredNotification>
        {
            Order(
                request,
                contacts,
                isReminder: false,
                request.NotificationChannel ?? NotificationChannel.Email,
                request.EmailSubject,
                request.EmailBody,
                request.SmsBody,
                created,
                created
            ),
        };

        if (request.SendReminder)
        {
            notifications.Add(
                Order(
                    request,
                    contacts,
                    isReminder: true,
                    request.ReminderNotificationChannel ?? request.NotificationChannel ?? NotificationChannel.Email,
                    request.ReminderEmailSubject ?? request.EmailSubject,
                    request.ReminderEmailBody ?? request.EmailBody,
                    request.ReminderSmsBody ?? request.SmsBody,
                    created,
                    created + ReminderDelay
                )
            );
        }

        return notifications;
    }

    private static StoredNotification Order(
        NotificationRequestDto request,
        IReadOnlyList<ContactPoint> contacts,
        bool isReminder,
        NotificationChannel channel,
        string? emailSubject,
        string? emailBody,
        string? smsBody,
        DateTimeOffset created,
        DateTimeOffset sendTime
    )
    {
        bool generic = request.NotificationTemplate == NotificationTemplate.GenericAltinnMessage;
        var emails = new List<SentEmail>();
        var smses = new List<SentSms>();

        foreach (ContactPoint contact in contacts)
        {
            (bool sendEmail, bool sendSms) = Channels(channel, contact);
            if (sendEmail)
            {
                emails.Add(
                    new SentEmail
                    {
                        Id = Guid.NewGuid(),
                        Recipient = contact.Recipient(email: true),
                        Subject = generic ? GenericEmailSubject : emailSubject ?? string.Empty,
                        Body = generic ? GenericEmailBody : emailBody ?? string.Empty,
                    }
                );
            }
            if (sendSms)
            {
                smses.Add(
                    new SentSms
                    {
                        Id = Guid.NewGuid(),
                        Recipient = contact.Recipient(email: false),
                        Body = generic ? GenericSmsBody : smsBody ?? string.Empty,
                    }
                );
            }
        }

        return new StoredNotification
        {
            OrderId = Guid.NewGuid(),
            IsReminder = isReminder,
            Channel = channel,
            Template = request.NotificationTemplate,
            SendersReference = request.SendersReference,
            Created = created,
            RequestedSendTime = sendTime,
            Status = emails.Count + smses.Count > 0 ? NotificationStatus.Success : NotificationStatus.MissingContact,
            Emails = emails,
            Smses = smses,
        };
    }

    private static (bool Email, bool Sms) Channels(NotificationChannel channel, ContactPoint contact)
    {
        bool hasEmail = !string.IsNullOrWhiteSpace(contact.Email);
        bool hasSms = !string.IsNullOrWhiteSpace(contact.MobileNumber);
        return channel switch
        {
            NotificationChannel.Email => (hasEmail, false),
            NotificationChannel.Sms => (false, hasSms),
            NotificationChannel.EmailPreferred => (hasEmail, !hasEmail && hasSms),
            NotificationChannel.SmsPreferred => (!hasSms && hasEmail, hasSms),
            NotificationChannel.EmailAndSms => (hasEmail, hasSms),
            _ => (false, false),
        };
    }

    /// <summary>
    /// The addresses to notify: the correspondence's own recipients when it names any, otherwise every registered
    /// email address and mobile number of the correspondence's recipient.
    /// </summary>
    private async Task<IReadOnlyList<ContactPoint>> ResolveContacts(NotificationRequestDto request, string recipient)
    {
        if (request.CustomRecipients is { Count: > 0 } customRecipients)
        {
            var contacts = new List<ContactPoint>();
            foreach (NotificationRecipientDto custom in customRecipients)
            {
                bool hasAddress =
                    !string.IsNullOrWhiteSpace(custom.EmailAddress) || !string.IsNullOrWhiteSpace(custom.MobileNumber);
                if (hasAddress)
                {
                    contacts.Add(
                        new ContactPoint(
                            custom.OrganizationNumber,
                            custom.NationalIdentityNumber,
                            custom.EmailAddress,
                            custom.MobileNumber,
                            custom.IsReserved
                        )
                    );
                }
                else
                {
                    contacts.AddRange(
                        await RegisteredContacts(custom.OrganizationNumber, custom.NationalIdentityNumber)
                    );
                }
            }
            return contacts;
        }

        (string? organizationNumber, string? nationalIdentityNumber) = ParseRecipient(recipient);
        return await RegisteredContacts(organizationNumber, nationalIdentityNumber);
    }

    private async Task<IReadOnlyList<ContactPoint>> RegisteredContacts(
        string? organizationNumber,
        string? nationalIdentityNumber
    )
    {
        if (!string.IsNullOrWhiteSpace(nationalIdentityNumber))
        {
            var users = await profileClient.GetUserContactPoints([nationalIdentityNumber]);
            return
            [
                .. users.Select(user => new ContactPoint(
                    null,
                    nationalIdentityNumber,
                    user.Email,
                    user.MobileNumber,
                    user.IsReserved
                )),
            ];
        }

        if (!string.IsNullOrWhiteSpace(organizationNumber))
        {
            var organizations = await registerClient.GetOrganizationContactPoints([organizationNumber]);
            return
            [
                .. organizations.SelectMany(organization =>
                    organization
                        .EmailList.Select(email => new ContactPoint(organizationNumber, null, email, null, null))
                        .Concat(
                            organization.MobileNumberList.Select(mobile => new ContactPoint(
                                organizationNumber,
                                null,
                                null,
                                mobile,
                                null
                            ))
                        )
                ),
            ];
        }

        return [];
    }

    /// <summary>
    /// The organization or national identity number in a recipient, which is a URN or, as the API also accepts,
    /// the bare number.
    /// </summary>
    internal static (string? OrganizationNumber, string? NationalIdentityNumber) ParseRecipient(string recipient)
    {
        if (recipient.StartsWith(OrganizationUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return (recipient[OrganizationUrnPrefix.Length..], null);
        }
        if (recipient.StartsWith(PersonUrnPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return (null, recipient[PersonUrnPrefix.Length..]);
        }
        return recipient.Length == 11 ? (null, recipient) : (recipient, null);
    }

    private sealed record ContactPoint(
        string? OrganizationNumber,
        string? NationalIdentityNumber,
        string? Email,
        string? MobileNumber,
        bool? IsReserved
    )
    {
        public NotificationRecipientDto Recipient(bool email) =>
            new()
            {
                OrganizationNumber = OrganizationNumber,
                NationalIdentityNumber = NationalIdentityNumber,
                EmailAddress = email ? Email : null,
                MobileNumber = email ? null : MobileNumber,
                IsReserved = IsReserved,
            };
    }
}
