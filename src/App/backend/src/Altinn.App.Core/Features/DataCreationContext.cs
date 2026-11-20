using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

namespace Altinn.App.Core.Features;

/// <summary>
/// Parameters for <see cref="IInstantiationProcessor.DataCreation(DataCreationContext)"/>.
/// </summary>
public sealed class DataCreationContext
{
    /// <summary>
    /// Mutator for the instance the data object is created on.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// The data object created.
    /// </summary>
    public required object Data { get; init; }

    /// <summary>
    /// External prefill available under instantiation if supplied.
    /// </summary>
    public Dictionary<string, string>? Prefill { get; init; }

    /// <summary>
    /// The actor the data object is created for: the caller of the request, or in a workflow-engine callback the actor
    /// who started the transition, as the workflow engine recorded it; the callback itself is authenticated as the app.
    /// </summary>
    public required Actor Actor { get; init; }

    /// <summary>
    /// Cancellation token for the operation.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;
}
