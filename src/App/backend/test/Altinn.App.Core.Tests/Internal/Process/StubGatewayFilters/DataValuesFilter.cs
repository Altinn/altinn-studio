using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.PlatformServices.Tests.Internal.Process.StubGatewayFilters;

public class DataValuesFilter : IProcessExclusiveGateway
{
    public string GatewayId { get; }

    private readonly string _filterOnDataValue;

    public DataValuesFilter(string gatewayId, string filterOnDataValue)
    {
        GatewayId = gatewayId;
        _filterOnDataValue = filterOnDataValue;
    }

    public async Task<List<SequenceFlow>> FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        IInstanceDataAccessor dataAccessor,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        var targetFlow = instance.DataValues[_filterOnDataValue];
        return await Task.FromResult(outgoingFlows.FindAll(e => e.Id == targetFlow));
    }

    Task<List<SequenceFlow>> IProcessExclusiveGateway.FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        //TODO: Remove when obsolete method is removed from interface
        throw new NotImplementedException();
    }
}
