using Altinn.App.Core.Features.Process;
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
        // Workflow engine callback helpers
        services.AddTransient<ProcessTaskResolver>();
        services.AddTransient<ProcessNextRequestFactory>();
        services.AddSingleton<ProcessStepOptionsResolver>();
        services.AddTransient<WorkflowStateSigner>();
        services.AddTransient<WorkflowCallbackStateService>();
        services.AddTransient<MailboxDeliveryEnvelope>();
        services.AddTransient<IWorkflowEngineService, WorkflowEngineService>();
        services.AddTransient<MailboxRelay>();

        // The inbound half of a mailbox exchange: whatever channel receives an external system's answer
        // hands it here, and it reaches the waiting service task's reply handler through the engine.
        services.AddTransient<IServiceTaskReplyForwarder, ServiceTaskReplyForwarder>();

        services
            .AddHttpClient<IWorkflowEngineClient, WorkflowEngineClient>()
            .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(30));

        // Callback authentication (app signs at enqueue, app validates at callback)
        services.TryAddSingleton<IWorkflowCallbackSecretProvider, WorkflowCallbackSecretProvider>();
        services.TryAddSingleton<IWorkflowCallbackTokenGenerator, WorkflowCallbackTokenGenerator>();
        services.TryAddSingleton<IWorkflowCallbackTokenValidator, WorkflowCallbackTokenValidator>();

        // Fail fast at startup if no usable WorkflowEngineCallback code is configured.
        services.AddOptions<AppCodesSettings>().ValidateOnStart();
        services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IValidateOptions<AppCodesSettings>, WorkflowCallbackAppCodesValidator>()
        );

        // Workflow engine commands - TaskStart
        services.AddTransient<IWorkflowEngineCommand, CleanupGeneratedFromTask>();
        services.AddTransient<IWorkflowEngineCommand, CommonTaskInitialization>();
        services.AddTransient<IWorkflowEngineCommand, StartTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskStartingHook>();
        services.AddTransient<IWorkflowEngineCommand, UnlockTaskData>();

        // Workflow engine commands - TaskAbandon
        services.AddTransient<IWorkflowEngineCommand, AbandonTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskAbandonHook>();

        // Workflow engine commands - TaskEnd
        services.AddTransient<IWorkflowEngineCommand, CommonTaskFinalization>();
        services.AddTransient<IWorkflowEngineCommand, EndTask>();
        services.AddTransient<IWorkflowEngineCommand, OnTaskEndingHook>();
        services.AddTransient<IWorkflowEngineCommand, LockTaskData>();

        // Workflow engine commands - ServiceTask
        services.AddTransient<IWorkflowEngineCommand, ExecuteServiceTask>();
        services.AddTransient<IWorkflowEngineCommand, MintMailbox>();

        // Workflow engine commands - Notifications
        services.AddTransient<IWorkflowEngineCommand, NotifyInstanceOwnerOnInstantiation>();

        // Workflow engine commands - ProcessEnd
        services.AddTransient<IWorkflowEngineCommand, OnProcessEndedHook>();
        services.AddTransient<IWorkflowEngineCommand, DeleteDataOnProcessEnd>();

        // Workflow engine commands - State Management
        services.AddTransient<ProcessingStatusAcquirer>();
        services.AddTransient<IWorkflowEngineCommand, CommitProcessState>();
        services.AddTransient<IWorkflowEngineCommand, ReleaseProcessingStatus>();
        services.AddTransient<IWorkflowEngineCommand, EnqueueAuxiliaryWorkflows>();

        // Workflow engine commands - Altinn Events
        services.AddTransient<IWorkflowEngineCommand, CompletedAltinnEvent>();
        services.AddTransient<IWorkflowEngineCommand, InstanceCreatedAltinnEvent>();
        services.AddTransient<IWorkflowEngineCommand, MovedToAltinnEvent>();

        // Fail fast at startup if any app handler declares invalid step execution options.
        services.AddHostedService<WorkflowStepOptionsValidator>();

        // Fail fast at startup on invalid service-task pipelines (a DefineExecute that throws or returns null, a
        // mailbox left unanswered).
        services.AddHostedService<ServiceTaskRegistrationValidator>();
    }
}
