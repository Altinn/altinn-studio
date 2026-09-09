using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>Preserves frozen execution options when binding runtime recipient identities.</summary>
internal static class SigningWorkflowSteps
{
    internal static StepRequest Create(string key) =>
        new()
        {
            OperationId = key,
            CommandKey = key,
            Command = CommandDefinition.Create("app", new AppCommandData { CommandKey = key }),
        };

    internal static StepRequest WithPayload<T>(StepRequest template, T payload)
        where T : CommandRequestPayload
    {
        AppCommandData command = GetAppCommand(template);
        return template with
        {
            Command = template.Command with
            {
                Data = JsonSerializer.SerializeToElement(
                    command with
                    {
                        Payload = CommandPayloadSerializer.Serialize(payload),
                    }
                ),
            },
        };
    }

    internal static AppCommandData GetAppCommand(StepRequest step) =>
        step.Command.Type == "app"
        && step.Command.Data is { } data
        && JsonSerializer.Deserialize<AppCommandData>(data) is { } command
            ? command
            : throw new InvalidOperationException("The signing workflow template must contain an app command.");

    internal static string? GetKey(StepRequest step) =>
        step.Command.Type == "app" && step.Command.Data is { } data
            ? JsonSerializer.Deserialize<AppCommandData>(data)?.CommandKey
            : null;
}
