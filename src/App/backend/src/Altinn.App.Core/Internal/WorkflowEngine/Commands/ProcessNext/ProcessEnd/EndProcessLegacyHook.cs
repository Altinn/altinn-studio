using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

internal sealed class EndProcessLegacyHook : IWorkflowEngineCommand
{
    public static string Key => "EndProcessLegacyHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly Telemetry? _telemetry;

    public EndProcessLegacyHook(IServiceProvider serviceProvider, Telemetry? telemetry = null)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _telemetry = telemetry;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;
        string? endEvent = instance.Process?.EndEvent;

        if (string.IsNullOrEmpty(endEvent))
        {
            return FailedProcessEngineCommandResult.Retryable(
                new InvalidOperationException("End event is not set on instance process state")
            );
        }

        try
        {
            using Activity? mainActivity = _telemetry?.StartProcessEndHandlersActivity(instance);

            List<IProcessEnd> processEnds = _appImplementationFactory.GetAll<IProcessEnd>().ToList();

            foreach (IProcessEnd processEnd in processEnds)
            {
                using Activity? nestedActivity = _telemetry?.StartProcessEndHandlerActivity(instance, processEnd);
                // Note: events parameter is null since we don't have access to the events here in the callback
                await processEnd.End(instance, null);
            }

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
