using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
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
        ArgumentNullException.ThrowIfNull(instance);

        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();

        if (string.IsNullOrWhiteSpace(appMetadata.EFormidling?.Receiver))
        {
            return new List<Receiver>();
        }

        string receiver = appMetadata.EFormidling.Receiver.Trim();

        return CreateReceiverList(receiver);
    }

    /// <inheritdoc />
    public Task<List<Receiver>> GetEFormidlingReceivers(Instance instance, string? receiverFromConfig)
    {
        ArgumentNullException.ThrowIfNull(instance);

        if (string.IsNullOrWhiteSpace(receiverFromConfig))
        {
            return Task.FromResult(new List<Receiver>());
        }

        string receiver = receiverFromConfig.Trim();

        return Task.FromResult(CreateReceiverList(receiver));
    }

    private static List<Receiver> CreateReceiverList(string receiver)
    {
        var identifier = new Identifier
        {
            // 0192 prefix for all Norwegian organisations.
            Value = $"0192:{receiver}",
            Authority = "iso6523-actorid-upis",
        };

        return [new Receiver { Identifier = identifier }];
    }
}
