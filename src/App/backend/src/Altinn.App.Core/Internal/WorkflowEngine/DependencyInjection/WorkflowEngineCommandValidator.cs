using System.Diagnostics.CodeAnalysis;
using System.Reflection;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;

/// <summary>
/// Validates that all process engine commands referenced in ProcessEventCommands are registered in DI.
/// </summary>
internal static class ProcessEngineCommandValidator
{
    /// <summary>
    /// Validates that all required commands are registered. Throws if any are missing.
    /// Call this immediately after registering commands in AddProcessServices.
    /// </summary>
    public static void Validate(IServiceCollection services)
    {
        HashSet<string> requiredCommandKeys = GetRequiredCommandKeys();
        HashSet<string> registeredCommandKeys = GetRegisteredCommandKeys(services);

        var missingCommands = requiredCommandKeys.Except(registeredCommandKeys).ToList();

        if (missingCommands.Count > 0)
        {
            string missingCommandsList = string.Join(", ", missingCommands.Select(k => $"'{k}'"));
            throw new InvalidOperationException(
                $"Process Engine configuration error: The following command keys are referenced but not registered: {missingCommandsList}. "
                    + "Ensure all commands are registered in ServiceCollectionExtensions.AddProcessServices()."
            );
        }
    }

    private static HashSet<string> GetRequiredCommandKeys()
    {
        var keys = new HashSet<string>();

        // Collect keys from all event types with all features enabled to cover all possible commands
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTaskType = null,
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTaskType = null,
                    IsInitialTaskStart = true,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(
            WorkflowCommandSet.GetTaskStartSteps(
                new TaskStartContext
                {
                    ServiceTaskType = "DummyServiceTask",
                    IsInitialTaskStart = false,
                    RegisterEvents = true,
                }
            ),
            keys
        );
        CollectCommandKeys(WorkflowCommandSet.GetTaskEndSteps(), keys);
        CollectCommandKeys(WorkflowCommandSet.GetTaskAbandonSteps(), keys);
        CollectCommandKeys(
            WorkflowCommandSet.GetProcessEndSteps(
                new ProcessEndContext
                {
                    RegisterEvents = true,
                    HasAutoDeleteDataTypes = true,
                    AutoDeleteInstanceOnProcessEnd = true,
                }
            ),
            keys
        );

        // SaveProcessStateToStorage is automatically inserted
        keys.Add(SaveProcessStateToStorage.Key);

        return keys;
    }

    private static void CollectCommandKeys(WorkflowCommandSet eventCommandSet, HashSet<string> keys)
    {
        foreach (var commandRequest in eventCommandSet.Commands)
        {
            if (TryGetAppCommandKey(commandRequest, out string? commandKey))
            {
                keys.Add(commandKey);
            }
        }

        foreach (var commandRequest in eventCommandSet.PostProcessNextCommittedCommands)
        {
            if (TryGetAppCommandKey(commandRequest, out string? commandKey))
            {
                keys.Add(commandKey);
            }
        }
    }

    private static bool TryGetAppCommandKey(StepRequest step, [NotNullWhen(true)] out string? commandKey)
    {
        if (step.Command.Type == "app" && step.Command.Data is { } data)
        {
            var appData = System.Text.Json.JsonSerializer.Deserialize<AppCommandData>(data);
            if (appData is not null)
            {
                commandKey = appData.CommandKey;
                return true;
            }
        }

        commandKey = null;
        return false;
    }

    private static HashSet<string> GetRegisteredCommandKeys(IServiceCollection services)
    {
        return services
            .Where(sd => sd.ServiceType == typeof(IWorkflowEngineCommand))
            .Select(sd => sd.ImplementationType)
            .OfType<Type>()
            .Select(implType => GetCommandKeyFromType(implType))
            .ToHashSet();
    }

    private static string GetCommandKeyFromType(Type commandType)
    {
        // Get the static Key property
        var keyProperty = commandType.GetProperty("Key", BindingFlags.Public | BindingFlags.Static);

        if (keyProperty?.PropertyType == typeof(string))
        {
            return (string?)keyProperty.GetValue(null)
                ?? throw new InvalidOperationException(
                    $"Command type {commandType.Name} has a null 'Key' property value"
                );
        }

        throw new InvalidOperationException(
            $"Command type {commandType.Name} does not have a public static 'Key' property"
        );
    }
}
