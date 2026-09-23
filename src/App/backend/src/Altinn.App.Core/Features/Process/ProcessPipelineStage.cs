using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.DependencyInjection;

namespace Altinn.App.Core.Features.Process;

/// <summary>An ordinary durable stage shared by lifecycle and service pipelines.</summary>
internal abstract class ProcessPipelineStage : PipelineItem
{
    private protected ProcessPipelineStage(ProcessStepOptions? options, string? name)
        : base(options)
    {
        options?.Validate();
        Name = name;
    }

    internal string? Name { get; }

    internal abstract Task<ProcessEngineCommandResult> Execute(
        AppImplementationFactory factory,
        ProcessEngineCommandContext context
    );

    internal sealed class Command : ProcessPipelineStage
    {
        internal Command(WorkflowCommandRef reference, ProcessStepOptions? options, string? name)
            : base(options, name ?? reference?.Key)
        {
            ArgumentNullException.ThrowIfNull(reference);
            if (name is not null)
            {
                ArgumentException.ThrowIfNullOrWhiteSpace(name);
            }
            Reference = reference;
        }

        internal WorkflowCommandRef Reference { get; }

        internal override Task<ProcessEngineCommandResult> Execute(
            AppImplementationFactory factory,
            ProcessEngineCommandContext context
        )
        {
            if (WorkflowEngineCommandValidator.FrameworkCommandKeys.Contains(Reference.Key))
            {
                return Task.FromResult(
                    ProcessEngineCommandResult.FailedPermanent(
                        $"Framework command '{Reference.Key}' cannot execute as a pipeline stage.",
                        "InvalidStageCommand"
                    )
                );
            }
            IWorkflowEngineCommand? command = factory
                .GetAll<IWorkflowEngineCommand>()
                .SingleOrDefault(candidate => candidate.GetKey() == Reference.Key);
            return command is null
                ? Task.FromResult(
                    ProcessEngineCommandResult.FailedPermanent(
                        $"Pipeline command '{Reference.Key}' is not registered.",
                        "PipelineCommandNotFound"
                    )
                )
                : command.Execute(context with { CommandPayload = Reference.Payload });
        }
    }

    /// <summary>A stage with no part in any exchange: work in, stage result out.</summary>
    internal sealed class ServiceHandler : ProcessPipelineStage
    {
        public ServiceHandler(
            Func<ServiceTaskContext, Task<ServiceTaskStageResult>> work,
            ProcessStepOptions? stepOptions,
            string? name = null
        )
            : base(stepOptions, name)
        {
            Work = work;
        }

        /// <summary>The stage's work, exactly as the app supplied it.</summary>
        public Func<ServiceTaskContext, Task<ServiceTaskStageResult>> Work { get; }

        internal override async Task<ProcessEngineCommandResult> Execute(
            AppImplementationFactory factory,
            ProcessEngineCommandContext context
        ) =>
            PipelineStageExecutor.ServiceResult(
                await Work(PipelineStageExecutor.ServiceContext(context)),
                context.TaskType ?? throw new InvalidOperationException("The service task type is missing.")
            );
    }

    internal sealed class Handler(
        string name,
        Func<ProcessEngineCommandContext, Task<ProcessEngineCommandResult>> work,
        ProcessStepOptions? options
    ) : ProcessPipelineStage(options, name)
    {
        internal override Task<ProcessEngineCommandResult> Execute(
            AppImplementationFactory factory,
            ProcessEngineCommandContext context
        ) => work(context);
    }
}
