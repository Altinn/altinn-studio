using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

internal sealed class OnTaskEndingHook : IWorkflowEngineCommand
{
    public static string Key => "OnTaskEndingHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public OnTaskEndingHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public async Task<WorkflowEngineCommandResult> Execute(WorkflowEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process?.CurrentTask?.ElementId ?? string.Empty;

        IEnumerable<IOnTaskEndingHandler> hooks = _appImplementationFactory.GetAll<IOnTaskEndingHandler>();
        List<IOnTaskEndingHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count > 1)
        {
            return FailedWorkflowEngineCommandResult.Permanent(
                $"Multiple {nameof(IOnTaskEndingHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed.",
                nameof(InvalidOperationException)
            );
        }

        IOnTaskEndingHandler? hook = applicableHooks.FirstOrDefault();
        if (hook == null)
        {
            return new SuccessfulWorkflowEngineCommandResult();
        }

        var hookParameters = new OnTaskEndingContext
        {
            TaskId = taskId,
            InstanceDataMutator = dataMutator,
            CancellationToken = parameters.CancellationToken,
        };

        try
        {
            HandlerResult result = await hook.Execute(hookParameters);

            return result switch
            {
                SuccessfulHandlerResult => new SuccessfulWorkflowEngineCommandResult(),
                FailedHandlerResult failed => failed.Kind == FailureKind.Permanent
                    ? FailedWorkflowEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedWorkflowEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(HandlerResult)} type: {result.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedWorkflowEngineCommandResult.Retryable(ex);
        }
    }
}
