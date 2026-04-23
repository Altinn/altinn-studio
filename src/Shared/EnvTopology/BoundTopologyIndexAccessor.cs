#nullable enable

using Microsoft.Extensions.Options;

namespace Altinn.Studio.EnvTopology;

public sealed class BoundTopologyIndexAccessor
{
    private BoundTopologyIndex _current;

    public BoundTopologyIndexAccessor(IOptionsMonitor<BoundTopologyConfig> boundTopologyConfig)
    {
        _current = new BoundTopologyIndex(boundTopologyConfig.Get(BoundTopologyOptions.MergedName));
        boundTopologyConfig.OnChange(
            (config, name) =>
            {
                if (name == BoundTopologyOptions.MergedName)
                {
                    Volatile.Write(ref _current, new BoundTopologyIndex(config));
                }
            }
        );
    }

    public BoundTopologyIndex Current => Volatile.Read(ref _current);
}
