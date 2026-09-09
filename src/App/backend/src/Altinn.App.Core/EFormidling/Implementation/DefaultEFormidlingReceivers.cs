using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models.SBD;
using Altinn.App.Core.Features;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Default implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingReceivers"/>
/// </summary>
public class DefaultEFormidlingReceivers : IEFormidlingReceivers
{
    /// <inheritdoc />
    public Task<List<Receiver>> GetEFormidlingReceivers(IInstanceDataAccessor dataAccessor, string? receiverFromConfig)
    {
        ArgumentNullException.ThrowIfNull(dataAccessor);

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
            // 0192 prefix for all Norwegian organizations.
            Value = $"0192:{receiver}",
            Authority = "iso6523-actorid-upis",
        };

        return [new Receiver { Identifier = identifier }];
    }
}
