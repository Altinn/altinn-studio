using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

/// <summary>
/// Lifecycle status of a mailbox.
/// </summary>
/// <remarks>
/// Persisted as the lowercase text values <c>open</c> and <c>disposed</c>, constrained by a database
/// check constraint. The wire representation follows the engine's enum convention (PascalCase out,
/// case-insensitive in) via <see cref="FlexibleEnumConverter{TEnum}"/>.
/// </remarks>
[JsonConverter(typeof(FlexibleEnumConverter<MailboxStatus>))]
public enum MailboxStatus
{
    /// <summary>
    /// The mailbox accepts deliveries.
    /// </summary>
    Open = 0,

    /// <summary>
    /// The mailbox is closed for deliveries. Terminal: nothing reopens a mailbox.
    /// </summary>
    Disposed = 1,
}
