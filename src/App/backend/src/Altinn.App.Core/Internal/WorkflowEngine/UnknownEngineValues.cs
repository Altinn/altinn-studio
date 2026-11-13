using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// The engine enum values this process read as <c>Unknown</c>, kept so that each is logged once.
/// </summary>
/// <remarks>
/// <see cref="Models.Engine.TolerantEnumConverter{TEnum}"/> is the only place that sees the name of an unknown value,
/// and a JSON converter has no logger. It records the value here, and the code that reads the engine logs what is
/// new after each read. Status reads are polled, so a warning per read would flood the log. One warning per value
/// tells the operator that the engine is ahead of this version of the app.
/// </remarks>
internal sealed class UnknownEngineValues
{
    // Bounds the memory a misbehaving engine could take by sending ever-new names.
    private const int MaxValues = 100;

    private readonly ConcurrentDictionary<string, bool> _seen = new(StringComparer.Ordinal);
    private readonly ConcurrentQueue<string> _unlogged = new();

    /// <summary>The values the engine enum converters record into.</summary>
    internal static UnknownEngineValues Shared { get; } = new();

    internal void Record(string enumName, string value)
    {
        string qualified = $"{enumName}.{value}";
        if (_seen.Count < MaxValues && _seen.TryAdd(qualified, true))
        {
            _unlogged.Enqueue(qualified);
        }
    }

    /// <summary>Logs a warning for each value recorded since the last call, so each value is logged once.</summary>
    internal void LogNew(ILogger logger)
    {
        while (_unlogged.TryDequeue(out string? value))
        {
            logger.LogWarning(
                "The workflow engine sent {EngineValue}, which this version of the app does not know, so the app "
                    + "reads it as unknown. A newer version of the app libraries may know it.",
                value
            );
        }
    }
}
