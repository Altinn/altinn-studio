namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// The outcome of a migration job. <see cref="ManualActionRequired"/> is set when the migrator ran
/// but could not fully apply its change - e.g. it left a legacy flag in place, or could not verify a
/// required grant - so a human must finish the work before the app is v9-ready. This is distinct from
/// an outright error (an unhandled exception): the upgrade completed everything it safely could, but
/// the result is not "done", and the CLI reflects that with a dedicated exit code so tooling can tell
/// "clean" apart from "needs manual follow-up".
/// </summary>
internal sealed record MigrationResult(bool ManualActionRequired, IReadOnlyList<string> Warnings);
