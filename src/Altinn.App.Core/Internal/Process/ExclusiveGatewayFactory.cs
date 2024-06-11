using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Class responsible for returning correct implementation of <see cref="IProcessExclusiveGateway"/> for a given gateway
/// </summary>
public class ExclusiveGatewayFactory
{
    /// <summary>
    /// Name of the default logic for exclusive gateways
    /// </summary>
    public const string DefaultImplName = "altinn_default_gateway";
    private readonly IEnumerable<IProcessExclusiveGateway> _gateways;

    /// <summary>
    /// Initialize new instance of <see cref="ExclusiveGatewayFactory"/>
    /// </summary>
    /// <param name="gateways">IEnumerable of <see cref="IProcessExclusiveGateway"/> that defines gateway logic</param>
    public ExclusiveGatewayFactory(IEnumerable<IProcessExclusiveGateway> gateways)
    {
        _gateways = gateways;
    }

    /// <summary>
    /// Returns <see cref="IProcessExclusiveGateway"/> with same GatewayId as ExclusiveGateways Id in BPMN process
    /// </summary>
    /// <param name="gatewayId">Id of exclusive gateway in the process</param>
    /// <returns><see cref="IProcessExclusiveGateway"/> if found, null if not</returns>
    public IProcessExclusiveGateway? GetProcessExclusiveGateway(string gatewayId)
    {
        return _gateways.FirstOrDefault(gateway =>
            string.Equals(gateway.GatewayId, gatewayId, StringComparison.OrdinalIgnoreCase)
        );
    }
}
