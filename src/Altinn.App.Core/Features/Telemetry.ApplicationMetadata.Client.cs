using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.ApplicationMetadataClient;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetApplicationMetadataActivity() => ActivitySource.StartActivity($"{_prefix}.Get");

    internal Activity? StartGetApplicationXACMLPolicyActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetXACMLPolicy");

    internal Activity? StartGetApplicationBPMNProcessActivity() =>
        ActivitySource.StartActivity($"{_prefix}.GetBPMNProcess");

    internal static class ApplicationMetadataClient
    {
        internal const string _prefix = "ApplicationMetadata.Client";
    }
}
