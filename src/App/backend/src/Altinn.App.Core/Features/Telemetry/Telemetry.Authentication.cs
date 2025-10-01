using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartRefreshAuthenticationTokenActivity() =>
        ActivitySource.StartActivity($"Authentication.Refresh");
}
