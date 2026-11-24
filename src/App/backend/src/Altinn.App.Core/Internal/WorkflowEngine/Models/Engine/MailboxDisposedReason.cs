using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Why a mailbox was closed. Public because it appears on
/// <see cref="Models.AppCommand.AppCallbackMailbox"/>, which the callback controller model-binds. App code is not
/// told the reason: an external stage's <c>onTimeout</c> runs for either.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<MailboxDisposedReason>))]
public enum MailboxDisposedReason
{
    /// <summary>A caller closed the mailbox explicitly.</summary>
    Request = 0,

    /// <summary>The mailbox reached its deadline and was closed by the engine.</summary>
    Deadline = 1,
}
