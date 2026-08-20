using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

/// <summary>
/// Lifecycle status of a mailbox. Persisted as the lowercase text values <c>open</c> and <c>disposed</c>,
/// constrained by a database check constraint.
/// </summary>
[JsonConverter(typeof(FlexibleEnumConverter<MailboxStatus>))]
public enum MailboxStatus
{
    /// <summary>The mailbox accepts deliveries.</summary>
    Open = 0,

    /// <summary>The mailbox is closed for deliveries. Terminal: nothing reopens a mailbox.</summary>
    Disposed = 1,
}
