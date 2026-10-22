using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

/// <summary>Applies the known scenarios to the app's C# source.</summary>
internal sealed class KnownScenarioMigration(CSharpSourceScanner scanner)
{
    /// <summary>Every known scenario, in run order. One line per scenario.</summary>
    public static readonly IReadOnlyList<IKnownScenario> All = [new UnlockWriteRelockInProcessDataReadScenario()];

    /// <summary>
    /// Applies every scenario in order; the messages come in that order, each scenario's sorted by file and line.
    /// </summary>
    public MigrationResult Migrate() => new([.. All.SelectMany(scenario => scenario.Apply(scanner).Messages)]);
}
