using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;

internal static class ServiceCollectionExtensions
{
    internal static void AddWorkflowEngineIntegration(this IServiceCollection services)
    {
        // Process engine callback helpers
        services.AddTransient<ProcessTaskResolver>();
        services.AddTransient<ProcessNextRequestFactory>();
        services.AddTransient<InstanceStateService>();
        services.AddTransient<IWorkflowEngineService, WorkflowEngineService>();
        services.AddHttpClient<IWorkflowEngineClient, WorkflowEngineClient>();

        // Process engine callback handlers - TaskStart
        services.AddTransient<IWorkflowEngineCommand, CommonTaskInitialization>();
        services.AddTransient<IWorkflowEngineCommand, StartTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskStartingHook>();
        services.AddTransient<IWorkflowEngineCommand, StartTaskLegacyHook>();
        services.AddTransient<IWorkflowEngineCommand, UnlockTaskData>();

        // Process engine callback handlers - TaskAbandon
        services.AddTransient<IWorkflowEngineCommand, AbandonTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskAbandonHook>();
        services.AddTransient<IWorkflowEngineCommand, AbandonTaskLegacyHook>();

        // Process engine callback handlers - TaskEnd
        services.AddTransient<IWorkflowEngineCommand, CommonTaskFinalization>();
        services.AddTransient<IWorkflowEngineCommand, EndTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskEndingHook>();
        services.AddTransient<IWorkflowEngineCommand, EndTaskLegacyHook>();
        services.AddTransient<IWorkflowEngineCommand, LockTaskData>();

        // Process engine callback handlers - ServiceTask
        services.AddTransient<IWorkflowEngineCommand, ExecuteServiceTask>();

        // Process engine callback handlers - Notifications
        services.AddTransient<IWorkflowEngineCommand, NotifyInstanceOwnerOnInstantiation>();

        // Process engine callback handlers - ProcessEnd
        services.AddTransient<IWorkflowEngineCommand, OnProcessEndingHook>();
        services.AddTransient<IWorkflowEngineCommand, EndProcessLegacyHook>();
        services.AddTransient<IWorkflowEngineCommand, DeleteDataElementsIfConfigured>();
        services.AddTransient<IWorkflowEngineCommand, DeleteInstanceIfConfigured>();

        // Process engine callback handlers - State Management
        services.AddTransient<IWorkflowEngineCommand, MutateProcessState>();
        services.AddTransient<IWorkflowEngineCommand, SaveProcessStateToStorage>();

        // Process engine callback handlers - Altinn Events
        services.AddTransient<IWorkflowEngineCommand, CompletedAltinnEvent>();
        services.AddTransient<IWorkflowEngineCommand, InstanceCreatedAltinnEvent>();
        services.AddTransient<IWorkflowEngineCommand, MovedToAltinnEvent>();

        // Validate all commands are registered
        ProcessEngineCommandValidator.Validate(services);
    }
}
