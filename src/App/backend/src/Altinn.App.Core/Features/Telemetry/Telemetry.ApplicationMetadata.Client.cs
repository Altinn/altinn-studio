using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.ApplicationMetadataClient;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetApplicationMetadataActivity() => ActivitySource.StartActivity($"{Prefix}.Get");

    internal Activity? StartGetApplicationXACMLPolicyActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetXACMLPolicy");

    internal Activity? StartGetApplicationBPMNProcessActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetBPMNProcess");

    internal static class ApplicationMetadataClient
    {
        internal const string Prefix = "ApplicationMetadata.Client";
    }
}
