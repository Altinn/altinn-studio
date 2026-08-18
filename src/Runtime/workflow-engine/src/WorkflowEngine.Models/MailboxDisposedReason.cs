using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

/// <summary>
/// Why a mailbox was closed. Reported explicitly rather than inferred, so a consumer never has to
/// derive "was this closed on purpose or did it simply run out of time" from timestamps.
/// </summary>
/// <remarks>
/// Persisted as the lowercase text values <c>request</c> and <c>deadline</c>, constrained by a
/// database check constraint.
/// </remarks>
[JsonConverter(typeof(FlexibleEnumConverter<MailboxDisposedReason>))]
public enum MailboxDisposedReason
{
    /// <summary>
    /// A caller closed the mailbox explicitly (<c>DELETE</c>).
    /// </summary>
    Request = 0,

    /// <summary>
    /// The mailbox reached its deadline and was closed by the engine.
    /// </summary>
    Deadline = 1,
}
