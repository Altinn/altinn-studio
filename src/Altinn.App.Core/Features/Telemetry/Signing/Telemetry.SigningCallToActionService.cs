using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartSendSignCallToActionActivity() =>
        ActivitySource.StartActivity("SigningCallToActionService.SendSignCallToAction");
}
