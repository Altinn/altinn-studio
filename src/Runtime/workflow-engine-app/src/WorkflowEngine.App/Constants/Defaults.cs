using WorkflowEngine.App.Commands.AppCommand;

namespace WorkflowEngine.App.Constants;

internal static class Defaults
{
    public static readonly AppCommandSettings AppCommandSettings = new() { ApiKey = "injected-at-runtime" };
}
