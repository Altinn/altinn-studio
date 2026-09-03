using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Signing.Models;

internal record ContentWrapper
{
    internal required CorrespondenceContent CorrespondenceContent { get; init; }
    internal required string SendersReference { get; init; }
    internal OrganizationOrPersonIdentifier? Recipient { get; init; }
    internal NotificationChoice? NotificationChoice { get; init; }
    internal Notification? Notification { get; init; }
    internal Notification? ReminderNotification { get; init; }
    internal string? SmsBody { get; init; }
    internal string? EmailBody { get; init; }
    internal string? EmailSubject { get; init; }
    internal string? ReminderSmsBody { get; init; }
    internal string? ReminderEmailBody { get; init; }
    internal string? ReminderEmailSubject { get; init; }
}
