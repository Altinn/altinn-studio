using System.Diagnostics;
using static Altinn.App.Core.Features.Telemetry.EFormidlingClient;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartEFormidlingCreateMessageActivity() =>
        LibraryActivitySource.StartActivity($"{Prefix}.CreateMessage");

    internal Activity? StartEFormidlingUploadAttachmentActivity() =>
        LibraryActivitySource.StartActivity($"{Prefix}.UploadAttachment");

    internal Activity? StartEFormidlingSendMessageActivity() =>
        LibraryActivitySource.StartActivity($"{Prefix}.SendMessage");

    internal Activity? StartEFormidlingGetMessageStatusActivity() =>
        LibraryActivitySource.StartActivity($"{Prefix}.GetMessageStatusById");

    internal static class EFormidlingClient
    {
        internal const string Prefix = "EFormidlingClient";
    }
}
