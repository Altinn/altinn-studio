using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

/// <summary>
/// Dictionary-backed <see cref="IServiceTaskCheckpoints"/> for tests: values round-trip within the
/// fake, nothing is persisted. Stands in for the runtime's Storage-backed implementation wherever a
/// test constructs a <see cref="ServiceTaskContext"/> directly.
/// </summary>
internal sealed class InMemoryServiceTaskCheckpoints : IServiceTaskCheckpoints
{
    private readonly Dictionary<string, string> _values = new(StringComparer.Ordinal);

    public Task Set(string key, string value)
    {
        _values[key] = value;
        return Task.CompletedTask;
    }

    public Task<string?> Get(string key) => Task.FromResult(_values.TryGetValue(key, out string? value) ? value : null);
}
