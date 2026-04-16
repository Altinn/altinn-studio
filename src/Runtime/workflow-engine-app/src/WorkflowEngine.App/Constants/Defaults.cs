using WorkflowEngine.App.Commands.AppCommand;

namespace WorkflowEngine.App.Constants;

internal static class Defaults
{
    public static readonly AppCommandSettings AppCommandSettings = new()
    {
        CommandEndpoint =
            "http://{Org}-{App}-deployment.default.svc.cluster.local/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks/",
    };
}
