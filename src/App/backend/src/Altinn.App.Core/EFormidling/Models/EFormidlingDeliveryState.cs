namespace Altinn.App.Core.EFormidling.Models;

/// <summary>
/// How far an eFormidling shipment has got, classified from the integrasjonspunkt's status list.
/// </summary>
public enum EFormidlingDeliveryState
{
    /// <summary>
    /// No terminal outcome yet: the shipment has neither been confirmed delivered nor failed. Covers
    /// everything from "created" through "sent" and "received by the recipient", and also a shipment
    /// the integrasjonspunkt has no status for at all. Something to wait for, not to act on.
    /// </summary>
    Pending,

    /// <summary>
    /// Confirmed delivered to — or read by — the recipient. Terminal, and the outcome a delivery wait
    /// is waiting for.
    /// </summary>
    Delivered,

    /// <summary>
    /// Terminally failed: the integrasjonspunkt rejected the shipment, or its lifetime expired. The
    /// message id is the instance id and cannot be reused, so this needs manual follow-up rather
    /// than a retry.
    /// </summary>
    Failed,
}
