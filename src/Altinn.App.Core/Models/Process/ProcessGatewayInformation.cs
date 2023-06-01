namespace Altinn.App.Core.Models.Process;

/// <summary>
/// Additional information about the gateway in the context of a running process
/// </summary>
public class ProcessGatewayInformation
{
    /// <summary>
    /// The action performed to reach the gateway
    /// </summary>
    public string? Action { get; set; }

    /// <summary>
    /// The datatype associated with the gateway
    /// </summary>
    public string? DataTypeId { get; set; }
}
