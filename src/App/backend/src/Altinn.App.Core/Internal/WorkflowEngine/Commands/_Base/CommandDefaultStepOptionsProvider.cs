using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Singleton lookup of each command's default per-step execution options (tier 2 in the resolution
/// order: implementation override → command default → engine default). The map is built once from the
/// registered <see cref="IWorkflowEngineCommand"/> set — command defaults are static per command type,
/// so there is no reason to re-resolve the full command list on every process-next request.
/// </summary>
internal sealed class CommandDefaultStepOptionsProvider
{
    private readonly IReadOnlyDictionary<string, ProcessStepOptions?> _defaults;

    public CommandDefaultStepOptionsProvider(IEnumerable<IWorkflowEngineCommand> commands)
    {
        _defaults = commands
            .GroupBy(c => c.GetKey(), StringComparer.Ordinal)
            .ToDictionary(g => g.Key, g => g.First().DefaultStepOptions, StringComparer.Ordinal);
    }

    /// <summary>
    /// Returns the command's default step options, or null when the command declares none (the engine's
    /// global defaults apply).
    /// </summary>
    public ProcessStepOptions? GetDefaultStepOptions(string commandKey) => _defaults.GetValueOrDefault(commandKey);
}
