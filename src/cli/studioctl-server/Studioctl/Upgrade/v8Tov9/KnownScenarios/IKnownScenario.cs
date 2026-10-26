using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

/// <summary>
/// A narrow rewrite of one code pattern found in deployed v8 apps that v9 refuses or breaks. A scenario matches
/// exactly the shape it was written for and leaves every other shape alone, silently: it is not a detector. It may
/// report a match it leaves alone when only the developer can make the remaining choice, saying why. The doc comment
/// on each says what it matches, what it rewrites, why that is safe, and where it was seen. Register
/// it in <see cref="KnownScenarioMigration.All"/>; delete it by deleting its file, that line, and its test file.
/// Scenarios are stateless: <see cref="KnownScenarioMigration.All"/> is shared, also across parallel tests.
/// </summary>
internal interface IKnownScenario
{
    /// <summary>
    /// Rewrites every match through the scanner and reports each rewrite; a clean result when nothing matches.
    /// Only called with semantic models; a file without one is skipped.
    /// </summary>
    /// <param name="projectFolder">The folder of the app's project file, which holds <c>config/</c>.</param>
    MigrationResult Apply(CSharpSourceScanner scanner, string projectFolder);
}
