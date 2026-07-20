using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Default implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers"/>
/// </summary>
public class DefaultEFormidlingReceivers : IEFormidlingReceivers
{
    /// <inheritdoc />
    public Task<List<Receiver>> GetEFormidlingReceivers(
        Instance instance,
        string? receiverFromConfig,
        IInstanceDataAccessor? dataAccessor = null
    )
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
