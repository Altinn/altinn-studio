using WorkflowEngine.App.Commands.AppCommand;

namespace WorkflowEngine.App.Constants;

internal static class Defaults
{
    public static readonly AppCommandSettings AppCommandSettings = new()
    {
#pragma warning disable S5332 // In-cluster app callbacks use cluster-local HTTP endpoints.
        CommandEndpoint =
            "http://{Org}-{App}-deployment.default.svc.cluster.local/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/workflow-engine-callbacks/",
#pragma warning restore S5332
    };
}
