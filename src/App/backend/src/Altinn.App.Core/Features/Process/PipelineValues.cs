namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Small named values a pipeline's stages hand to the stages composed after them, such as the reference an
/// external system returned for a request a stage sent. Read and written through
/// <see cref="ServiceTaskContext.Values"/>.
/// </summary>
/// <remarks>
/// <para>
/// Values travel in the workflow state, not in instance data, so recording one needs no save. What a step
/// records is kept when the step completes (a stage's <c>Completed</c>, or a result that concludes the
/// pipeline) and discarded otherwise: a failed attempt keeps nothing, and a deferring attempt must not record
/// anything, because a deferral is stateless.
/// </para>
/// <para>
/// Each pipeline sees only its own values. The first item of a pipeline starts with none, so nothing recorded
/// by an earlier visit to the same task reaches a new one.
/// </para>
/// </remarks>
public sealed class PipelineValues
{
    /// <summary>The most values one pipeline can hold.</summary>
    public const int MaxCount = 32;

    /// <summary>The longest a value's name can be.</summary>
    public const int MaxNameLength = 100;

    /// <summary>The longest a value can be.</summary>
    public const int MaxValueLength = 4000;

    private readonly Dictionary<string, string> _values;

    /// <summary>
    /// Creates an empty set of values, for a <see cref="ServiceTaskContext"/> built outside the workflow
    /// engine, such as in a unit test.
    /// </summary>
    public PipelineValues()
        : this(null) { }

    internal PipelineValues(IReadOnlyDictionary<string, string>? values)
    {
        _values = values is null
            ? new Dictionary<string, string>(StringComparer.Ordinal)
            : new Dictionary<string, string>(values, StringComparer.Ordinal);
    }

    /// <summary>
    /// Whether this step recorded or removed a value. A step that did neither leaves the values it was handed
    /// exactly as they were.
    /// </summary>
    internal bool IsChanged { get; private set; }

    /// <summary>The value recorded under <paramref name="name"/>, or <c>null</c> when there is none.</summary>
    public string? Get(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return _values.GetValueOrDefault(name);
    }

    /// <summary>
    /// Records <paramref name="value"/> under <paramref name="name"/>, replacing any value already there.
    /// </summary>
    /// <exception cref="ArgumentException">
    /// The name is blank or longer than <see cref="MaxNameLength"/>, the value is longer than
    /// <see cref="MaxValueLength"/>, or recording it would hold more than <see cref="MaxCount"/> values.
    /// </exception>
    public void Set(string name, string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentNullException.ThrowIfNull(value);
        if (name.Length > MaxNameLength)
        {
            throw new ArgumentException(
                $"A pipeline value's name can be at most {MaxNameLength} characters, but '{name}' is {name.Length}.",
                nameof(name)
            );
        }

        if (value.Length > MaxValueLength)
        {
            throw new ArgumentException(
                $"A pipeline value can be at most {MaxValueLength} characters, but the value for '{name}' is "
                    + $"{value.Length}. Values travel in the workflow state; keep larger content in instance data.",
                nameof(value)
            );
        }

        if (!_values.ContainsKey(name) && _values.Count >= MaxCount)
        {
            throw new ArgumentException(
                $"A pipeline can hold at most {MaxCount} values, so '{name}' cannot be added.",
                nameof(name)
            );
        }

        if (_values.TryGetValue(name, out string? existing) && existing == value)
        {
            return;
        }

        _values[name] = value;
        IsChanged = true;
    }

    /// <summary>Removes the value recorded under <paramref name="name"/>, if there is one.</summary>
    public void Remove(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (_values.Remove(name))
        {
            IsChanged = true;
        }
    }

    /// <summary>A copy of every value, for the workflow state.</summary>
    internal IReadOnlyDictionary<string, string> Snapshot() =>
        new Dictionary<string, string>(_values, StringComparer.Ordinal);
}
