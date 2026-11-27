using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartSendSignCallToActionActivity() =>
        LibraryActivitySource.StartActivity("SigningCallToActionService.SendSignCallToAction");
}
