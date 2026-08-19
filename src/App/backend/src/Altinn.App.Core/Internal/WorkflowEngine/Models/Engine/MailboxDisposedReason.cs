using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>
/// Why a mailbox was closed. Reported by the engine explicitly rather than inferred, so a consumer
/// never has to derive "was this closed on purpose or did it simply run out of time" from timestamps.
/// Public because it appears on <see cref="Models.AppCommand.AppCallbackMailbox"/>, which the callback
/// controller model-binds; app code reads the app-facing
/// <see cref="Features.Process.MailboxClosedReason"/> instead.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<MailboxDisposedReason>))]
public enum MailboxDisposedReason
{
    /// <summary>A caller closed the mailbox explicitly.</summary>
    Request = 0,

    /// <summary>The mailbox reached its deadline and was closed by the engine.</summary>
    Deadline = 1,
}
