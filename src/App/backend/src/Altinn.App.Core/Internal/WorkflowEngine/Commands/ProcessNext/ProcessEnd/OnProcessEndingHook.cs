using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

internal sealed class OnProcessEndingHook : IWorkflowEngineCommand
{
    public static string Key => "OnProcessEndingHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public OnProcessEndingHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        IInstanceDataMutator dataMutator = parameters.InstanceDataMutator;
        string taskId = dataMutator.Instance.Process?.CurrentTask?.ElementId ?? string.Empty;

        List<IOnProcessEndingHandler> onProcessEndingHandlers = _appImplementationFactory
            .GetAll<IOnProcessEndingHandler>()
            .ToList();

        if (onProcessEndingHandlers.Count > 1)
        {
            throw new InvalidOperationException(
                $"Multiple {nameof(IOnProcessEndingHandler)} hooks are registered for task '{taskId}'. Only one hook per task is allowed."
            );
        }

        IOnProcessEndingHandler? hook = onProcessEndingHandlers.FirstOrDefault();
        if (hook == null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        var hookParameters = new OnProcessEndingHandlerContext { InstanceDataMutator = dataMutator };

        try
        {
            OnProcessEndingHandlerResult result = await hook.ExecuteAsync(hookParameters);

            return result switch
            {
                SuccessfulOnProcessEndingHandlerResult => new SuccessfulProcessEngineCommandResult(),
                FailedOnProcessEndingHandlerResult failed => failed.NonRetryable
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
