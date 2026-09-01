using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>Lifecycle status of a mailbox.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<MailboxStatus>))]
internal enum MailboxStatus
{
    /// <summary>The mailbox accepts deliveries.</summary>
    Open = 0,

    /// <summary>The mailbox is closed for deliveries. Terminal: nothing reopens a mailbox.</summary>
    Disposed = 1,
}
