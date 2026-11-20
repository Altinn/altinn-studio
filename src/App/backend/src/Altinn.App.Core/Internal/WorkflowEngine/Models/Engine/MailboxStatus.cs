using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

/// <summary>Lifecycle status of a mailbox.</summary>
[JsonConverter(typeof(TolerantEnumConverter<MailboxStatus>))]
internal enum MailboxStatus
{
    /// <summary>
    /// A status this version does not know, which a newer engine sent. The app's own member, never on the wire. No
    /// code reads a mailbox's status, so it only keeps a mint or close from failing on the value.
    /// </summary>
    Unknown = -1,

    /// <summary>The mailbox accepts deliveries.</summary>
    Open = 0,

    /// <summary>The mailbox is closed for deliveries. Terminal: nothing reopens a mailbox.</summary>
    Disposed = 1,
}
