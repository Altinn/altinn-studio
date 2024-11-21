using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Default implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers"/>
/// </summary>
public class DefaultEFormidlingReceivers : IEFormidlingReceivers
{
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// Initializes a new instance of the <see cref="DefaultEFormidlingReceivers"/> class.
    /// </summary>
    /// <param name="appMetadata">Service for fetching application metadata</param>
    public DefaultEFormidlingReceivers(IAppMetadata appMetadata)
    {
        _appMetadata = appMetadata;
    }

    /// <inheritdoc />
    public async Task<List<Receiver>> GetEFormidlingReceivers(Instance instance)
    {
        await Task.CompletedTask;

        Identifier identifier = new Identifier
        {
            // 0192 prefix for all Norwegian organisations.
            Value = $"0192:{(await _appMetadata.GetApplicationMetadata()).EFormidling.Receiver.Trim()}",
            Authority = "iso6523-actorid-upis",
        };

        Receiver receiver = new Receiver { Identifier = identifier };

        return new List<Receiver> { receiver };
    }
}
