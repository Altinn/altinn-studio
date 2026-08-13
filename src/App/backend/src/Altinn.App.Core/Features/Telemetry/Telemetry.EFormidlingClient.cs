using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.EFormidlingClient;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartEFormidlingCreateMessageActivity() =>
        ActivitySource.StartActivity($"{Prefix}.CreateMessage");

    internal Activity? StartEFormidlingUploadAttachmentActivity() =>
        ActivitySource.StartActivity($"{Prefix}.UploadAttachment");

    internal Activity? StartEFormidlingSendMessageActivity() => ActivitySource.StartActivity($"{Prefix}.SendMessage");

    internal Activity? StartEFormidlingGetMessageStatusActivity() =>
        ActivitySource.StartActivity($"{Prefix}.GetMessageStatusById");

    internal static class EFormidlingClient
    {
        internal const string Prefix = "EFormidlingClient";
    }
}
