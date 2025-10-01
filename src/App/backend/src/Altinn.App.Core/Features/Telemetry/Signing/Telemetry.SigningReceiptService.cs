using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartSendSignatureReceiptActivity() =>
        ActivitySource.StartActivity("SigningReceiptService.SendSignatureReceipt");

    internal Activity? StartGetCorrespondenceHeadersActivity() =>
        ActivitySource.StartActivity("SigningReceiptService.GetCorrespondenceHeaders");
}
