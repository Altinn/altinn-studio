using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Constants;

/// <summary>
/// The database vocabulary for a mailbox's <see cref="MailboxStatus"/> and
/// <see cref="MailboxDisposedReason"/>. Lowercase text rather than the integer the workflow statuses use,
/// because the values appear as literals in check constraints, partial index filters and raw SQL, where text
/// stays readable in a psql session. The literals are <c>const</c> so the SQL interpolating them is provably
/// constant (CA2100), and <c>MailboxStatusMapTests</c> pins each one to the enum member it stands for.
/// </summary>
internal static class MailboxStatusMap
{
    /// <summary>Database literal for <see cref="MailboxStatus.Open"/>.</summary>
    public const string Open = "open";

    /// <summary>Database literal for <see cref="MailboxStatus.Disposed"/>.</summary>
    public const string Disposed = "disposed";

    /// <summary>Database literal for <see cref="MailboxDisposedReason.Request"/>.</summary>
    public const string ReasonRequest = "request";

    /// <summary>Database literal for <see cref="MailboxDisposedReason.Deadline"/>.</summary>
    public const string ReasonDeadline = "deadline";

    /// <summary>Renders a status as its database literal.</summary>
    public static string ToDbValue(MailboxStatus status) =>
        status switch
        {
            MailboxStatus.Open => Open,
            MailboxStatus.Disposed => Disposed,
            _ => throw new ArgumentOutOfRangeException(nameof(status), status, "Unknown mailbox status."),
        };

    /// <summary>Renders a disposal reason as its database literal.</summary>
    public static string ToDbValue(MailboxDisposedReason reason) =>
        reason switch
        {
            MailboxDisposedReason.Request => ReasonRequest,
            MailboxDisposedReason.Deadline => ReasonDeadline,
            _ => throw new ArgumentOutOfRangeException(nameof(reason), reason, "Unknown mailbox disposal reason."),
        };

    /// <summary>Parses a database literal back to a status.</summary>
    public static MailboxStatus FromDbValue(string value) =>
        value switch
        {
            Open => MailboxStatus.Open,
            Disposed => MailboxStatus.Disposed,
            _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown mailbox status."),
        };

    /// <summary>Parses a database literal back to a disposal reason.</summary>
    public static MailboxDisposedReason ReasonFromDbValue(string value) =>
        value switch
        {
            ReasonRequest => MailboxDisposedReason.Request,
            ReasonDeadline => MailboxDisposedReason.Deadline,
            _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown mailbox disposal reason."),
        };
}
