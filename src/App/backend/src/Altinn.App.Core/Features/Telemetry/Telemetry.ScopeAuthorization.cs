using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartScopeAuthorizationServiceInitActivity() =>
        ActivitySource.StartActivity("ScopeAuthorizationService.Initialize");

    internal Activity? StartScopeAuthorizationActivity()
    {
        var activity = ActivitySource.StartActivity("ScopeAuthorizationMiddleware.Authorize");
        return activity;
    }
}
