using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

/// <summary>Applies the known scenarios to the app's C# source.</summary>
/// <param name="projectFolder">The folder of the app's project file, which holds <c>config/</c>.</param>
internal sealed class KnownScenarioMigration(CSharpSourceScanner scanner, string projectFolder)
{
    /// <summary>Every known scenario, in run order. One line per scenario.</summary>
    public static readonly IReadOnlyList<IKnownScenario> All =
    [
        new UnlockWriteRelockInProcessDataReadScenario(),
        new UnlockForLaterTaskScenario(),
        new DeleteAppOwnedDataAtProcessEndScenario(),
    ];

    /// <summary>
    /// Applies every scenario in order; the messages come in that order, each scenario's sorted by file and line.
    /// </summary>
    public MigrationResult Migrate() =>
        new([.. All.SelectMany(scenario => scenario.Apply(scanner, projectFolder).Messages)]);
}
