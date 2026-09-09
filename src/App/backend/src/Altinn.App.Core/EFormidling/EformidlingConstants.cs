namespace Altinn.App.Core.EFormidling;

/// <summary>
/// Shared constants within the Eformidling area.
/// </summary>
public static class EformidlingConstants
{
    /// <summary>
    /// Instance data value holding the id of the workflow that sent the instance's eFormidling
    /// shipment. eFormidling message ids are bound to the instance id, so only one shipment can
    /// ever be sent per instance; this value lets a retried attempt be told apart from a new pass
    /// through the process (which must fail rather than silently skip or re-send).
    /// </summary>
    public const string ShipmentOwnerWorkflowIdDataValueKey = "eFormidlingShipmentWorkflowId";

    /// <summary>
    /// Instance data value holding the last status the integrasjonspunkt reported for the instance's
    /// eFormidling shipment (for example <c>levert</c> or <c>feil</c>). Written when the delivery
    /// wait concludes, so what became of a shipment stays legible after the process has moved on.
    /// </summary>
    public const string ShipmentStatusDataValueKey = "eFormidlingShipmentStatus";
}
