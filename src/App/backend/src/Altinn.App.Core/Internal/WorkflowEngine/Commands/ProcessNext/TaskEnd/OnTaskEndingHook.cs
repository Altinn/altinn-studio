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

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process?.CurrentTask?.ElementId ?? string.Empty;

        IEnumerable<IOnTaskEndingHandler> hooks = _appImplementationFactory.GetAll<IOnTaskEndingHandler>();
        IEnumerable<IOnTaskEndingHandler> applicableHooks = hooks.Where(h => h.ShouldRunForTask(taskId)).ToList();

        if (applicableHooks.Count() > 1)
        {
            throw new InvalidOperationException(
                $"Multiple {nameof(IOnTaskEndingHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed."
            );
        }

        IOnTaskEndingHandler? hook = applicableHooks.FirstOrDefault();
        if (hook == null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        var hookParameters = new OnTaskEndingHandlerContext { InstanceDataMutator = dataMutator };

        try
        {
            OnEndingHandlerResult result = await hook.ExecuteAsync(hookParameters);

            return result switch
            {
                SuccessfulOnEndingHandlerResult => new SuccessfulProcessEngineCommandResult(),
                FailedOnTaskEndingHandlerResult failed => failed.NonRetryable
                    ? FailedProcessEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedProcessEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(OnEndingHandlerResult)} type: {result.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
