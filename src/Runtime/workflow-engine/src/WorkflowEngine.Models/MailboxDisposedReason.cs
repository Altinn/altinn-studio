using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

/// <summary>
/// Why a mailbox was closed. Reported explicitly rather than inferred from timestamps. Persisted as the
/// lowercase text values <c>request</c> and <c>deadline</c>, constrained by a database check constraint.
/// </summary>
[JsonConverter(typeof(FlexibleEnumConverter<MailboxDisposedReason>))]
public enum MailboxDisposedReason
{
    /// <summary>A caller closed the mailbox explicitly (<c>DELETE</c>).</summary>
    Request = 0,

    /// <summary>The mailbox reached its deadline and was closed by the engine.</summary>
    Deadline = 1,
}
