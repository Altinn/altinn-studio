using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Why a mailbox was closed. Public because it appears on
/// <see cref="Models.AppCommand.AppCallbackMailbox"/>, which the callback controller model-binds; app code reads
/// the app-facing <see cref="Features.Process.MailboxClosedReason"/> instead.
/// </summary>
[JsonConverter(typeof(TolerantEnumConverter<MailboxDisposedReason>))]
public enum MailboxDisposedReason
{
    /// <summary>
    /// A reason this version does not know, which a newer engine sent. The app's own member, never on the wire. The
    /// mailbox is closed all the same, and the app reports it to the task as
    /// <see cref="Features.Process.MailboxClosedReason.Request"/>.
    /// </summary>
    Unknown = -1,

    /// <summary>A caller closed the mailbox explicitly.</summary>
    Request = 0,

    /// <summary>The mailbox reached its deadline and was closed by the engine.</summary>
    Deadline = 1,
}
