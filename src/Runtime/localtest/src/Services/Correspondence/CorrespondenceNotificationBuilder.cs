using Altinn.Correspondence.Controllers;
using Altinn.Notifications.Core.Integrations;

namespace LocalTest.Services.Correspondence;

/// <summary>
/// Works out the notifications a correspondence orders, the way the Notifications service would: who gets an email
/// or an SMS, at which address, with which text. The addresses come from the recipient's contact information in
/// the Localtest test data and from the custom recipients the correspondence names. Nothing is sent. The text of a
/// generic notification is a stand-in: the real wording comes from the Correspondence API's templates.
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
        bool generic = request.NotificationTemplate != NotificationTemplate.CustomMessage;
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
    /// The addresses to notify: every registered email address and mobile number of the correspondence's recipient,
    /// and the custom recipients the correspondence names. Only the custom recipients when it overrides the
    /// registered contact information.
    /// </summary>
    private async Task<IReadOnlyList<ContactPoint>> ResolveContacts(NotificationRequestDto request, string recipient)
    {
        var contacts = new List<ContactPoint>();
        IReadOnlyList<NotificationRecipientDto> customRecipients = request.CustomRecipients ?? [];
        if (!request.OverrideRegisteredContactInformation || customRecipients.Count == 0)
        {
            var registered = CorrespondenceRecipient.TryParse(recipient);
            contacts.AddRange(
                await RegisteredContacts(registered?.OrganizationNumber, registered?.NationalIdentityNumber)
            );
        }

        foreach (NotificationRecipientDto custom in customRecipients)
        {
            bool hasAddress =
                !string.IsNullOrWhiteSpace(custom.EmailAddress) || !string.IsNullOrWhiteSpace(custom.MobileNumber);
            if (hasAddress)
            {
                contacts.Add(new ContactPoint(null, null, custom.EmailAddress, custom.MobileNumber, custom.IsReserved));
            }
            else
            {
                contacts.AddRange(
                    await RegisteredContacts(
                        CorrespondenceRecipient.WithoutPrefix(custom.OrganizationNumber),
                        CorrespondenceRecipient.WithoutPrefix(custom.NationalIdentityNumber)
                    )
                );
            }
        }
        return contacts;
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
