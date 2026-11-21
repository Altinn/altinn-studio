namespace Altinn.App.Core.Features.DataProcessing;

/// <summary>
/// Default implementation of the IInstantiationProcessor interface.
/// This implementation does not do any thing to the data
/// </summary>
internal sealed class NullInstantiationProcessor : IInstantiationProcessor
{
    /// <inheritdoc />
    public Task DataCreation(
        IInstanceDataMutator instanceDataMutator,
        object data,
        Dictionary<string, string>? prefill
    ) => Task.CompletedTask;
}
