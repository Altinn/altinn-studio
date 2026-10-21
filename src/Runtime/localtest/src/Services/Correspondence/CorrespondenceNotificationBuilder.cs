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

        IReadOnlyList<NotificationTarget> targets = await ResolveTargets(request, recipient);
        var notifications = new List<StoredNotification>
        {
            Order(
                request,
                targets,
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
                    targets,
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
        IReadOnlyList<NotificationTarget> targets,
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

        foreach (NotificationTarget target in targets)
        {
            var (emailAddresses, mobileNumbers) = Addresses(channel, target);
            foreach (string emailAddress in emailAddresses)
            {
                emails.Add(
                    new SentEmail
                    {
                        Id = Guid.NewGuid(),
                        Recipient = target.Recipient(emailAddress: emailAddress),
                        Subject = generic ? GenericEmailSubject : emailSubject ?? string.Empty,
                        Body = generic ? GenericEmailBody : emailBody ?? string.Empty,
                    }
                );
            }
            foreach (string mobileNumber in mobileNumbers)
            {
                smses.Add(
                    new SentSms
                    {
                        Id = Guid.NewGuid(),
                        Recipient = target.Recipient(mobileNumber: mobileNumber),
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

    /// <summary>
    /// The addresses a notification goes to. For a registered person or organization the channel chooses once, for the
    /// recipient as a whole, so an organization with an email address gets no SMS on a preferred-email channel. An
    /// address the request gives is used whatever the channel: the real API sends it on without one.
    /// </summary>
    private static (IReadOnlyList<string> Emails, IReadOnlyList<string> MobileNumbers) Addresses(
        NotificationChannel channel,
        NotificationTarget target
    )
    {
        if (target.IsExplicitAddress)
        {
            return (target.Emails, target.MobileNumbers);
        }

        bool hasEmail = target.Emails.Count > 0;
        bool hasSms = target.MobileNumbers.Count > 0;
        return channel switch
        {
            NotificationChannel.Email => (target.Emails, _none),
            NotificationChannel.Sms => (_none, target.MobileNumbers),
            NotificationChannel.EmailPreferred => hasEmail ? (target.Emails, _none) : (_none, target.MobileNumbers),
            NotificationChannel.SmsPreferred => hasSms ? (_none, target.MobileNumbers) : (target.Emails, _none),
            NotificationChannel.EmailAndSms => (target.Emails, target.MobileNumbers),
            _ => (_none, _none),
        };
    }

    /// <summary>
    /// Who to notify: the correspondence's recipient at their registered contact information, and the custom
    /// recipients the correspondence names. Only the custom recipients when it overrides the registered contact
    /// information.
    /// </summary>
    private async Task<IReadOnlyList<NotificationTarget>> ResolveTargets(
        NotificationRequestDto request,
        string recipient
    )
    {
        var targets = new List<NotificationTarget>();
        IReadOnlyList<NotificationRecipientDto> customRecipients = request.CustomRecipients ?? [];
        if (!request.OverrideRegisteredContactInformation || customRecipients.Count == 0)
        {
            var registered = CorrespondenceRecipient.TryParse(recipient);
            NotificationTarget? target = await RegisteredTarget(
                registered?.OrganizationNumber,
                registered?.NationalIdentityNumber
            );
            if (target is not null)
            {
                targets.Add(target);
            }
        }

        foreach (NotificationRecipientDto custom in customRecipients)
        {
            IReadOnlyList<string> emails = Present(custom.EmailAddress);
            IReadOnlyList<string> mobileNumbers = Present(custom.MobileNumber);
            if (emails.Count > 0 || mobileNumbers.Count > 0)
            {
                targets.Add(
                    new NotificationTarget(
                        null,
                        null,
                        emails,
                        mobileNumbers,
                        custom.IsReserved,
                        IsExplicitAddress: true
                    )
                );
            }
            else if (
                await RegisteredTarget(
                    CorrespondenceRecipient.WithoutPrefix(custom.OrganizationNumber),
                    CorrespondenceRecipient.WithoutPrefix(custom.NationalIdentityNumber)
                )
                is { } target
            )
            {
                targets.Add(target);
            }
        }
        return targets;
    }

    /// <summary>
    /// A registered person or organization with every email address and mobile number the test data has for them, or
    /// <c>null</c> when neither is given.
    /// </summary>
    private async Task<NotificationTarget?> RegisteredTarget(string? organizationNumber, string? nationalIdentityNumber)
    {
        if (!string.IsNullOrWhiteSpace(nationalIdentityNumber))
        {
            var users = await profileClient.GetUserContactPoints([nationalIdentityNumber]);
            return new NotificationTarget(
                null,
                nationalIdentityNumber,
                Present([.. users.Select(user => user.Email)]),
                Present([.. users.Select(user => user.MobileNumber)]),
                users.FirstOrDefault()?.IsReserved,
                IsExplicitAddress: false
            );
        }

        if (!string.IsNullOrWhiteSpace(organizationNumber))
        {
            var organizations = await registerClient.GetOrganizationContactPoints([organizationNumber]);
            return new NotificationTarget(
                organizationNumber,
                null,
                Present([.. organizations.SelectMany(organization => organization.EmailList)]),
                Present([.. organizations.SelectMany(organization => organization.MobileNumberList)]),
                null,
                IsExplicitAddress: false
            );
        }

        return null;
    }

    private static readonly IReadOnlyList<string> _none = [];

    private static IReadOnlyList<string> Present(params string?[] values) =>
        [.. values.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value!)];

    /// <summary>
    /// Someone a notification goes to, as the real API sends it on to the Notifications service: a registered person or
    /// organization, whose addresses the channel chooses among, or an address the request gives explicitly.
    /// </summary>
    private sealed record NotificationTarget(
        string? OrganizationNumber,
        string? NationalIdentityNumber,
        IReadOnlyList<string> Emails,
        IReadOnlyList<string> MobileNumbers,
        bool? IsReserved,
        bool IsExplicitAddress
    )
    {
        public NotificationRecipientDto Recipient(string? emailAddress = null, string? mobileNumber = null) =>
            new()
            {
                OrganizationNumber = OrganizationNumber,
                NationalIdentityNumber = NationalIdentityNumber,
                EmailAddress = emailAddress,
                MobileNumber = mobileNumber,
                IsReserved = IsReserved,
            };
    }
}
