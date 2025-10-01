using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartAppInstanceDelegationActivity() =>
        ActivitySource.StartActivity("AccessManagementClient.Delegate");

    internal Activity? StartAppInstanceRevokeActivity() =>
        ActivitySource.StartActivity("AccessManagementClient.Revoke");
}
