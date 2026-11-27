using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetStartEventsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetStartEvents");

    internal Activity? StartGetStartEventIdsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetStartEventIds");

    internal Activity? StartIsStartEventActivity() => LibraryActivitySource.StartActivity("ProcessReader.IsStartEvent");

    internal Activity? StartGetProcessTasksActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetProcessTasks");

    internal Activity? StartGetProcessTaskIdsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetProcessTaskIds");

    internal Activity? StartIsProcessTaskActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.IsProcessTask");

    internal Activity? StartGetExclusiveGatewaysActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetExclusiveGateways");

    internal Activity? StartGetExclusiveGatewayIdsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetExclusiveGatewayIds");

    internal Activity? StartGetEndEventsActivity() => LibraryActivitySource.StartActivity("ProcessReader.GetEndEvents");

    internal Activity? StartGetEndEventIdsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetEndEventIds");

    internal Activity? StartIsEndEventActivity() => LibraryActivitySource.StartActivity("ProcessReader.IsEndEvent");

    internal Activity? StartGetSequenceFlowsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetSequenceFlows");

    internal Activity? StartGetSequenceFlowIdsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetSequenceFlowIds");

    internal Activity? StartGetFlowElementActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetFlowElement");

    internal Activity? StartGetNextElementsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetNextElements");

    internal Activity? StartGetOutgoingSequenceFlowsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetOutgoingSequenceFlows");

    internal Activity? StartGetAllFlowElementsActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetAllFlowElements");

    internal Activity? StartGetAltinnTaskExtensionActivity() =>
        LibraryActivitySource.StartActivity("ProcessReader.GetAltinnTaskExtension");
}
