using System.Diagnostics;

namespace Altinn.App.Core.Features;

public partial class Telemetry
{
    internal Activity? GetUserDefinedService(string name)
    {
        return ActivitySource.StartActivity($"GetUserDefinedService{name}");
    }
}
