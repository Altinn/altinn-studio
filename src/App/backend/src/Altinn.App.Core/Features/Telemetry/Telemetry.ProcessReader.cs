using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartGetStartEventsActivity() => ActivitySource.StartActivity("ProcessReader.GetStartEvents");

    internal Activity? StartGetStartEventIdsActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetStartEventIds");

    internal Activity? StartIsStartEventActivity() => ActivitySource.StartActivity("ProcessReader.IsStartEvent");

    internal Activity? StartGetProcessTasksActivity() => ActivitySource.StartActivity("ProcessReader.GetProcessTasks");

    internal Activity? StartGetProcessTaskIdsActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetProcessTaskIds");

    internal Activity? StartIsProcessTaskActivity() => ActivitySource.StartActivity("ProcessReader.IsProcessTask");

    internal Activity? StartGetExclusiveGatewaysActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetExclusiveGateways");

    internal Activity? StartGetExclusiveGatewayIdsActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetExclusiveGatewayIds");

    internal Activity? StartGetEndEventsActivity() => ActivitySource.StartActivity("ProcessReader.GetEndEvents");

    internal Activity? StartGetEndEventIdsActivity() => ActivitySource.StartActivity("ProcessReader.GetEndEventIds");

    internal Activity? StartIsEndEventActivity() => ActivitySource.StartActivity("ProcessReader.IsEndEvent");

    internal Activity? StartGetSequenceFlowsActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetSequenceFlows");

    internal Activity? StartGetSequenceFlowIdsActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetSequenceFlowIds");

    internal Activity? StartGetFlowElementActivity() => ActivitySource.StartActivity("ProcessReader.GetFlowElement");

    internal Activity? StartGetNextElementsActivity() => ActivitySource.StartActivity("ProcessReader.GetNextElements");

    internal Activity? StartGetOutgoingSequenceFlowsActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetOutgoingSequenceFlows");

    internal Activity? StartGetAllFlowElementsActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetAllFlowElements");

    internal Activity? StartGetAltinnTaskExtensionActivity() =>
        ActivitySource.StartActivity("ProcessReader.GetAltinnTaskExtension");
}
