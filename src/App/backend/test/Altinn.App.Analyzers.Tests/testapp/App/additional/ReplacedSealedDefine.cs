using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Models.logic;

// Violates ALTINNAPP0700: an IServiceTask replacing the sealed forwarding Define, explicitly.
internal sealed class ExplicitlyReplacedDefineTask : IServiceTask
{
    public string Type => "explicitReplace";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    ServiceTaskPipeline IPipelineServiceTask.Define(ServiceTaskPipelineBuilder pipeline) => pipeline.Finally(Execute);
}

// Violates ALTINNAPP0700: the same replacement, implicitly (a public Define shadowing the default).
internal sealed class ImplicitlyReplacedDefineTask : IServiceTask
{
    public string Type => "implicitReplace";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => pipeline.Finally(Execute);
}

// Fine: a simple task keeping the forwarding default.
internal sealed class WellBehavedSimpleTask : IServiceTask
{
    public string Type => "simple";

    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
}

// Fine: a pipeline task implementing Define — that is its contract, nothing is sealed for it.
internal sealed class WellBehavedPipelineTask : IPipelineServiceTask
{
    public string Type => "pipeline";

    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(_ => Task.FromResult(ServiceTaskStageResult.Completed()))
            .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
}
