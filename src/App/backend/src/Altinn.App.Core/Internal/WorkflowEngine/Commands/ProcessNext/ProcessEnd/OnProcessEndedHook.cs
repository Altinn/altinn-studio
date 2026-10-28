using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

internal sealed class OnProcessEndedHook : IWorkflowEngineCommand
{
    public static string Key => "OnProcessEndedHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public OnProcessEndedHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        List<IOnProcessEndedHandler> onProcessEndedHandlers = _appImplementationFactory
            .GetAll<IOnProcessEndedHandler>()
            .ToList();

        if (onProcessEndedHandlers.Count > 1)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Multiple {nameof(IOnProcessEndedHandler)} hooks are registered. Only one is allowed.",
                nameof(InvalidOperationException)
            );
        }

        IOnProcessEndedHandler? hook = onProcessEndedHandlers.FirstOrDefault();
        // The planner plans this step only when the app registers a handler. A step an earlier version planned
        // regardless, or whose handler a redeploy removed, finds none and has nothing to run.
        if (hook == null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        var hookParameters = new OnProcessEndedContext
        {
            InstanceDataMutator = parameters.InstanceDataMutator,
            CancellationToken = parameters.CancellationToken,
        };

        try
        {
            HandlerResult result = await hook.Execute(hookParameters);

            return result switch
            {
                SuccessfulHandlerResult => new SuccessfulProcessEngineCommandResult(),
                FailedHandlerResult failed => failed.Kind == FailureKind.Permanent
                    ? FailedProcessEngineCommandResult.Permanent(failed.ErrorMessage)
                    : FailedProcessEngineCommandResult.Retryable(failed.ErrorMessage),
                _ => throw new InvalidOperationException(
                    $"Unexpected {nameof(HandlerResult)} type: {result.GetType().Name}"
                ),
            };
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
