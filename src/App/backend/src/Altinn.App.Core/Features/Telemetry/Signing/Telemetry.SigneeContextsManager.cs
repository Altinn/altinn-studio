using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGenerateSigneeContextsActivity() =>
        ActivitySource.StartActivity("SigningContextsManager.GenerateSigneeContexts");

    internal Activity? StartReadSigneesContextsActivity() =>
        ActivitySource.StartActivity("SigningService.GetSigneeContexts");
}
