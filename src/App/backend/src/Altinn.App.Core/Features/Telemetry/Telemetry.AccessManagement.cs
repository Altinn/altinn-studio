using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartAppInstanceDelegationActivity() =>
        LibraryActivitySource.StartActivity("AccessManagementClient.Delegate");

    internal Activity? StartAppInstanceRevokeActivity() =>
        LibraryActivitySource.StartActivity("AccessManagementClient.Revoke");
}
