using Altinn.App.Core.Features;
using Microsoft.Extensions.DependencyInjection;

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
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initialize new instance of <see cref="ExclusiveGatewayFactory"/>
    /// </summary>
    /// <param name="serviceProvider">Service provider</param>
    public ExclusiveGatewayFactory(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Returns <see cref="IProcessExclusiveGateway"/> with same GatewayId as ExclusiveGateways Id in BPMN process
    /// </summary>
    /// <param name="gatewayId">Id of exclusive gateway in the process</param>
    /// <returns><see cref="IProcessExclusiveGateway"/> if found, null if not</returns>
    public IProcessExclusiveGateway? GetProcessExclusiveGateway(string gatewayId)
    {
        var gateways = _appImplementationFactory.GetAll<IProcessExclusiveGateway>();
        return gateways.FirstOrDefault(gateway =>
            string.Equals(gateway.GatewayId, gatewayId, StringComparison.OrdinalIgnoreCase)
        );
    }
}
