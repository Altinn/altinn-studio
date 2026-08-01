namespace Altinn.App.Core.EFormidling;

/// <summary>
/// Shared constants within the Eformidling area.
/// </summary>
public static class EformidlingConstants
{
    /// <summary>
    /// Name of event type for publishing and subscribing to be remined about instances sent
    /// and that needs status checking.
    /// </summary>
    public const string CheckInstanceStatusEventType = "app.eformidling.reminder.checkinstancestatus";

    /// <summary>
    /// Service-task checkpoint holding the id of the workflow that sent the instance's eFormidling
    /// shipment (stored as the instance data value <c>serviceTask:eFormidling:shipmentWorkflowId</c>).
    /// eFormidling message ids are bound to the instance id, so only one shipment can ever be sent
    /// per instance; this value lets a retried attempt be told apart from a new pass through the
    /// process (which must fail rather than silently skip or re-send).
    /// </summary>
    public const string ShipmentOwnerCheckpointKey = "shipmentWorkflowId";
}
