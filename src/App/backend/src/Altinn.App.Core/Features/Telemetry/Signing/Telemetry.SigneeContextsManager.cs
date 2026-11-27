using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGenerateSigneeContextsActivity() =>
        LibraryActivitySource.StartActivity("SigningContextsManager.GenerateSigneeContexts");

    internal Activity? StartReadSigneesContextsActivity() =>
        LibraryActivitySource.StartActivity("SigningService.GetSigneeContexts");
}
