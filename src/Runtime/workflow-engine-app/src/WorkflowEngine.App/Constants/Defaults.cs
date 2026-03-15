using WorkflowEngine.App.Commands.AppCommand;

namespace WorkflowEngine.App.Constants;

internal static class Defaults
{
    public static readonly AppCommandSettings AppCommandSettings = new()
    {
        ApiKey = "injected-at-runtime",
        CommandEndpoint =
            "http://local.altinn.cloud/{Org}/{App}/instances/{InstanceOwnerPartyId}/{InstanceGuid}/process-engine-callbacks",
    };
}
