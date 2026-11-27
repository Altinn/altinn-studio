using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartSendSignatureReceiptActivity() =>
        LibraryActivitySource.StartActivity("SigningReceiptService.SendSignatureReceipt");

    internal Activity? StartGetCorrespondenceHeadersActivity() =>
        LibraryActivitySource.StartActivity("SigningReceiptService.GetCorrespondenceHeaders");
}
