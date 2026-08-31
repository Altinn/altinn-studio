namespace Altinn.App.Core.EFormidling.Models;

/// <summary>
/// Where an eFormidling shipment has got to, as reported by the integrasjonspunkt and classified
/// into the outcomes a caller can act on.
/// </summary>
public sealed record EFormidlingShipmentStatus
{
    /// <summary>
    /// The classified outcome. Branch on this rather than on <see cref="Status"/> — the raw
    /// vocabulary belongs to the integrasjonspunkt.
    /// </summary>
    public required EFormidlingDeliveryState State { get; init; }

    /// <summary>
    /// The integrasjonspunkt status value behind the classification (e.g. <c>levert</c>, <c>feil</c>),
    /// or <c>null</c> when the shipment has no status at all yet.
    /// </summary>
    /// <remarks>
    /// For a terminal state this is the entry that decided the classification. For
    /// <see cref="EFormidlingDeliveryState.Pending"/> it is the most recently reported entry, carried
    /// along as a progress note for logs and waiting UIs — never something to branch on.
    /// </remarks>
    public string? Status { get; init; }

    /// <summary>
    /// The integrasjonspunkt's own description of <see cref="Status"/>, when it supplied one. This is
    /// where the error text of a failed shipment lives.
    /// </summary>
    public string? Description { get; init; }
}
