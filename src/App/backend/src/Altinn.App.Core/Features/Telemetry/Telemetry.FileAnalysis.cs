using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartAnalyzeActivity() => LibraryActivitySource.StartActivity("FileAnalysis.Analyze");
}
