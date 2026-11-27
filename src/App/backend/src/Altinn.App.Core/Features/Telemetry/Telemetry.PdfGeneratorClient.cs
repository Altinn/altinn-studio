using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGeneratePdfClientActivity()
    {
        var activity = LibraryActivitySource.StartActivity("PdfGeneratorClient.GeneratePdf");
        return activity;
    }
}
