using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartRefreshAuthenticationTokenActivity() =>
        LibraryActivitySource.StartActivity($"Authentication.Refresh");
}
