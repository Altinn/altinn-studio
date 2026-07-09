using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;

internal static class ServiceCollectionExtensions
{
    internal static void AddWorkflowEngineIntegration(this IServiceCollection services)
    {
        // Process engine callback helpers
        services.AddTransient<ProcessTaskResolver>();
        services.AddTransient<ProcessNextRequestFactory>();
        services.AddTransient<WorkflowStateSigner>();
        services.AddTransient<WorkflowCallbackStateService>();
        services.AddTransient<IWorkflowEngineService, WorkflowEngineService>();
        services.AddHttpClient<IWorkflowEngineClient, WorkflowEngineClient>();

        // Callback authentication (app signs at enqueue, app validates at callback)
        services.TryAddSingleton<IWorkflowCallbackSecretProvider, WorkflowCallbackSecretProvider>();
        services.TryAddSingleton<IWorkflowCallbackTokenGenerator, WorkflowCallbackTokenGenerator>();
        services.TryAddSingleton<IWorkflowCallbackTokenValidator, WorkflowCallbackTokenValidator>();

        // Fail fast at startup if no usable WorkflowEngineCallback code is configured.
        services.AddOptions<AppCodesSettings>().ValidateOnStart();
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IValidateOptions<AppCodesSettings>, WorkflowCallbackAppCodesValidator>()
        );

        // Process engine callback handlers - TaskStart
        services.AddTransient<IWorkflowEngineCommand, CleanupGeneratedFromTask>();
        services.AddTransient<IWorkflowEngineCommand, CommonTaskInitialization>();
        services.AddTransient<IWorkflowEngineCommand, StartTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskStartingHook>();
        services.AddTransient<IWorkflowEngineCommand, UnlockTaskData>();

        // Process engine callback handlers - TaskAbandon
        services.AddTransient<IWorkflowEngineCommand, AbandonTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskAbandonHook>();

        // Process engine callback handlers - TaskEnd
        services.AddTransient<IWorkflowEngineCommand, CommonTaskFinalization>();
        services.AddTransient<IWorkflowEngineCommand, EndTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskEndingHook>();
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
        services.AddTransient<IWorkflowEngineCommand, CommitProcessState>();

        // Process engine callback handlers - Altinn Events
        services.AddTransient<IWorkflowEngineCommand, CompletedAltinnEvent>();
        services.AddTransient<IWorkflowEngineCommand, InstanceCreatedAltinnEvent>();
        services.AddTransient<IWorkflowEngineCommand, MovedToAltinnEvent>();

        // Validate all commands are registered
        WorkflowEngineCommandValidator.Validate(services);
    }
}
