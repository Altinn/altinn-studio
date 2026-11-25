namespace Altinn.App.Core.Features.Process;

/// <summary>Results only an action pipeline can return.</summary>
internal static class ActionPipelineResult
{
    /// <summary>Ends the pipeline and returns the instance to idle on the same task.</summary>
    public static ServiceTaskResult Release() => ReleasedServiceTaskResult.Instance;
}

/// <summary>Created by <see cref="ActionPipelineResult.Release"/>.</summary>
internal sealed record ReleasedServiceTaskResult : ServiceTaskResult
{
    internal static readonly ReleasedServiceTaskResult Instance = new();
}
