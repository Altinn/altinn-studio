using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Constants;

/// <summary>
/// The database vocabulary for mailbox status and disposal reason: lowercase text, because the values
/// appear as literals in check constraints, index filters and raw SQL. <c>const</c> so interpolating SQL
/// stays provably constant (CA2100); <c>MailboxStatusMapTests</c> pins each literal to its enum member.
/// </summary>
internal static class MailboxStatusMap
{
    public const string Open = "open";

    public const string Disposed = "disposed";

    public const string ReasonRequest = "request";

    public const string ReasonDeadline = "deadline";

    public static string ToDbValue(MailboxStatus status) =>
        status switch
        {
            MailboxStatus.Open => Open,
            MailboxStatus.Disposed => Disposed,
            _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unknown mailbox status."),
        };

    public static string ToDbValue(MailboxDisposedReason reason) =>
        reason switch
        {
            MailboxDisposedReason.Request => ReasonRequest,
            MailboxDisposedReason.Deadline => ReasonDeadline,
            _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Unknown mailbox disposal reason."),
        };

    public static MailboxStatus FromDbValue(string value) =>
        value switch
        {
            Open => MailboxStatus.Open,
            Disposed => MailboxStatus.Disposed,
            _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown mailbox status."),
        };

    public static MailboxDisposedReason ReasonFromDbValue(string value) =>
        value switch
        {
            ReasonRequest => MailboxDisposedReason.Request,
            ReasonDeadline => MailboxDisposedReason.Deadline,
            _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown mailbox disposal reason."),
        };
}
