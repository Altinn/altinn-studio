using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartAnalyseActivity() => ActivitySource.StartActivity("FileAnalysis.Analyse");
}
