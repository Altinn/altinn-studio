using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetSignDocumentsActivity() =>
        ActivitySource.StartActivity("SignDocumentManager.GetSignDocuments");

    internal Activity? StartSynchronizeSigneeContextsWithSignDocumentsActivity(string taskId)
    {
        Activity? activity = ActivitySource.StartActivity(
            "SignDocumentManager.SynchronizeSigneeContextsWithSignDocuments"
        );
        activity?.SetTag(Labels.TaskId, taskId);
        return activity;
    }

    internal Activity? StartDownloadSignDocumentActivity() =>
        ActivitySource.StartActivity("SignDocumentManager.DownloadSignDocument");
}
