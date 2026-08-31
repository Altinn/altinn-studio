using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

namespace Altinn.App.Integration.Tests.Scenarios.GeneratedFromTaskCleanup;

/// <summary>
/// Observes the clean-slate invariant: when the PDF service task is (re-)entered, the
/// task-starting hook runs after <c>CleanupGeneratedFromTask</c>, so it must never see
/// data elements tagged as generated from the entering task - not even on re-entry after
/// a previous visit created a tagged PDF.
/// </summary>
public sealed class PdfTaskStartingProbe : IOnTaskStartingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_Pdf";

    public Task<HookResult> Execute(OnTaskStartingContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;
        int taggedElementCount =
            instance.Data?.Count(dataElement =>
                dataElement.References?.Exists(reference =>
                    reference.Relation == RelationType.GeneratedFrom
                    && reference.ValueType == ReferenceType.Task
                    && reference.Value == context.TaskId
                )
                    is true
            )
            ?? 0;
        SnapshotLogger.LogInfo(
            $"GeneratedFromTaskCleanup.OnTaskStarting.Task_Pdf.TaggedElementCount={taggedElementCount}"
        );
        return Task.FromResult<HookResult>(HookResult.Success());
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IOnTaskStartingHandler, PdfTaskStartingProbe>();
    }
}
