namespace Altinn.App.Core.Features.Signing.Models;

internal sealed record DefaultTexts
{
    internal required string Title { get; init; }
    internal required string Summary { get; init; }
    internal required string Body { get; init; }
    internal string? SmsBody { get; init; }
    internal string? EmailSubject { get; init; }
    internal string? EmailBody { get; init; }
    internal string? ReminderSmsBody { get; init; }
    internal string? ReminderEmailSubject { get; init; }
    internal string? ReminderEmailBody { get; init; }
}
