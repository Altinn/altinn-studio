using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetSignDocumentsActivity() =>
        LibraryActivitySource.StartActivity("SignDocumentManager.GetSignDocuments");

    internal Activity? StartSynchronizeSigneeContextsWithSignDocumentsActivity(string taskId)
    {
        Activity? activity = LibraryActivitySource.StartActivity(
            "SignDocumentManager.SynchronizeSigneeContextsWithSignDocuments"
        );
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal Activity? StartDownloadSignDocumentActivity() =>
        LibraryActivitySource.StartActivity("SignDocumentManager.DownloadSignDocument");
}
