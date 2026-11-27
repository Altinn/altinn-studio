using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetApplicationLanguageActivity() =>
        LibraryActivitySource.StartActivity("ApplicationLanguage.Get");
}
