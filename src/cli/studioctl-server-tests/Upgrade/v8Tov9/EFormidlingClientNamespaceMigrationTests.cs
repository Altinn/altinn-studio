using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the eFormidling client namespace rewrite, which moves apps from the
/// Altinn.Common.EFormidlingClient package to the code absorbed into Altinn.App.Core.
/// </summary>
public sealed class EFormidlingClientNamespaceMigrationTests : IDisposable
{
    private static readonly Regex AllCs = new(@"\.cs$");

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private void Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var projectFile = Path.Combine(_app.Root, "App", "App.csproj");
        var migration = new UsingNamespaceMigration(CSharpSourceScanner.ForProject(projectFile));
        foreach (var (oldNamespace, newNamespace) in V8Tov9Upgrade.EFormidlingNamespaces)
        {
            migration.Migrate(oldNamespace, newNamespace, AllCs);
        }
    }

    [Theory]
    [InlineData("Altinn.Common.EFormidlingClient", "Altinn.App.Core.EFormidling.Interface")]
    [InlineData("Altinn.Common.EFormidlingClient.Configuration", "Altinn.App.Core.EFormidling.Configuration")]
    [InlineData("Altinn.Common.EFormidlingClient.Models", "Altinn.App.Core.EFormidling.Models")]
    [InlineData("Altinn.Common.EFormidlingClient.Models.SBD", "Altinn.App.Core.EFormidling.Models.SBD")]
    public void RewritesEachMovedNamespace(string oldNamespace, string newNamespace)
    {
        var file = _app.Write("logic/EFormidlingReceivers.cs", $"using {oldNamespace};\npublic class R {{}}\n");

        Migrate();

        var migrated = File.ReadAllText(file);
        Assert.Contains($"using {newNamespace};", migrated, StringComparison.Ordinal);
        Assert.DoesNotContain($"using {oldNamespace};", migrated, StringComparison.Ordinal);
    }

    [Fact]
    public void RewritesTheModelNamespacesIndependently()
    {
        // Models and Models.SBD map to separate destinations because Arkivmelding exists in both with
        // different meanings; collapsing them would make the name ambiguous.
        var file = _app.Write(
            "logic/EFormidlingMetadata.cs",
            """
            using Altinn.Common.EFormidlingClient.Models;
            using Altinn.Common.EFormidlingClient.Models.SBD;
            public class M {}
            """
        );

        Migrate();

        var migrated = File.ReadAllText(file);
        Assert.Contains("using Altinn.App.Core.EFormidling.Models;", migrated, StringComparison.Ordinal);
        Assert.Contains("using Altinn.App.Core.EFormidling.Models.SBD;", migrated, StringComparison.Ordinal);
        Assert.DoesNotContain("Altinn.Common", migrated, StringComparison.Ordinal);
    }

    [Fact]
    public void LeavesTheRemovedExtensionsNamespaceAlone()
    {
        // Altinn.EFormidlingClient.Extensions has no destination - HttpClientExtension was deleted, not
        // moved - so rewriting it would point apps at a namespace that does not contain the methods.
        // RemovedEFormidlingClientApiDetector reports it instead.
        var file = _app.Write(
            "logic/BevillingsregisterClient.cs",
            """
            using Altinn.EFormidlingClient.Extensions;
            using Altinn.EFormidlingClient.Models;
            public class C {}
            """
        );

        Migrate();

        var migrated = File.ReadAllText(file);
        Assert.Contains("using Altinn.EFormidlingClient.Extensions;", migrated, StringComparison.Ordinal);
        Assert.Contains("using Altinn.EFormidlingClient.Models;", migrated, StringComparison.Ordinal);
    }

    [Fact]
    public void LeavesBuildOutputUntouched()
    {
        var generated = _app.Write(
            "obj/Debug/Generated.cs",
            "using Altinn.Common.EFormidlingClient.Models.SBD;\npublic class G {}\n"
        );

        Migrate();

        Assert.Contains("using Altinn.Common.EFormidlingClient.Models.SBD;", File.ReadAllText(generated));
    }
}
