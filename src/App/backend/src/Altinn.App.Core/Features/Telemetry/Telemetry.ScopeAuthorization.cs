using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartScopeAuthorizationServiceInitActivity() =>
        LibraryActivitySource.StartActivity("ScopeAuthorizationService.Initialize");

    internal Activity? StartScopeAuthorizationActivity()
    {
        var activity = LibraryActivitySource.StartActivity("ScopeAuthorizationMiddleware.Authorize");
        return activity;
    }
}
