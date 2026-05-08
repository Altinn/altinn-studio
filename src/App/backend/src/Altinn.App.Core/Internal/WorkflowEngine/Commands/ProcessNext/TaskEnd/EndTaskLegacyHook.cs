using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

#pragma warning disable CS0618 // Type or member is obsolete

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;

/// <summary>
/// Run the legacy IProcessTaskEnd implementations defined in the app. No unit of work and rollback support.
/// </summary>
internal sealed class EndTaskLegacyHook : IWorkflowEngineCommand
{
    public static string Key => "EndTaskLegacyHook";

    public string GetKey() => Key;

    private readonly AppImplementationFactory _appImplementationFactory;

    public EndTaskLegacyHook(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;
        string taskId = instance.Process.CurrentTask.ElementId;

        try
        {
            IEnumerable<IProcessTaskEnd> handlers = _appImplementationFactory.GetAll<IProcessTaskEnd>();

            foreach (IProcessTaskEnd taskEnd in handlers)
            {
                await taskEnd.End(taskId, instance);
            }

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}
