using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGeneratePdfClientActivity()
    {
        var activity = ActivitySource.StartActivity("PdfGeneratorClient.GeneratePdf");
        return activity;
    }
}
