using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class PartyContractsMigrationTests : IDisposable
{
    private static readonly Regex AllCSharpFiles = new(@"\.cs$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    /// <summary>
    /// <see cref="UsingNamespaceMigration"/> writes straight to <see cref="UpgradeConsole"/>, unlike the
    /// other migrators here which return a <see cref="MigrationResult"/> - it needs an output scope the
    /// way <c>V8Tov9Upgrade.RunAsync</c> provides one, so tests exercising it directly set one up too.
    /// </summary>
    private void MigratePartyNamespaces()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var migration = new UsingNamespaceMigration(Scanner());
        migration.Migrate("Altinn.Platform.Register.Models", "Altinn.App.Core.Models", AllCSharpFiles);
        migration.Migrate("Altinn.Platform.Register.Enums", "Altinn.App.Core.Models", AllCSharpFiles);
    }

    // --- namespace migration (UsingNamespaceMigration reused as-is) ------------------------------

    [Fact]
    public void NamespaceMigration_RewritesModelsNamespace()
    {
        _app.Write(
            "logic/PartyReader.cs",
            """
            using Altinn.Platform.Register.Models;
            public class PartyReader
            {
                public string? Name(Party party) => party.Name;
            }
            """
        );

        MigratePartyNamespaces();

        var migrated = _app.Read("logic/PartyReader.cs");
        Assert.Contains("using Altinn.App.Core.Models;", migrated);
        Assert.DoesNotContain("Altinn.Platform.Register", migrated);
    }

    /// <summary>
    /// A file importing both old namespaces (Party/Person/Organization from .Models, PartyType from
    /// .Enums) must end up with exactly one using for the new namespace, not two.
    /// </summary>
    [Fact]
    public void NamespaceMigration_DedupesWhenBothOldNamespacesWereImported()
    {
        _app.Write(
            "logic/PartyTypeReader.cs",
            """
            using Altinn.Platform.Register.Enums;
            using Altinn.Platform.Register.Models;
            public class PartyTypeReader
            {
                public bool IsOrg(Party party) => party.PartyTypeName == PartyType.Organisation;
            }
            """
        );

        MigratePartyNamespaces();

        var migrated = _app.Read("logic/PartyTypeReader.cs");
        Assert.Single(Regex.Matches(migrated, "using Altinn.App.Core.Models;"));
        Assert.DoesNotContain("Altinn.Platform.Register", migrated);
    }

    /// <summary>
    /// Party/Person/Organization/PartyType and UserProfile/UserType/ProfileSettingPreference collapse
    /// into the same target namespace from three different old namespaces. A file importing all three
    /// must still end up with exactly one using for the new namespace, matching how
    /// <see cref="Altinn.Studio.Cli.Upgrade.v8Tov9.V8Tov9Upgrade"/> chains the Party and UserProfile
    /// namespace steps one after another rather than in a single call.
    /// </summary>
    [Fact]
    public void NamespaceMigration_DedupesAcrossAllThreeOldNamespaces()
    {
        _app.Write(
            "logic/ProfileReader.cs",
            """
            using Altinn.Platform.Register.Enums;
            using Altinn.Platform.Register.Models;
            using Altinn.Platform.Profile.Models;
            public class ProfileReader
            {
                public bool IsOrg(UserProfile profile) => profile.Party.PartyTypeName == PartyType.Organisation;
            }
            """
        );

        MigratePartyNamespaces();

        using (var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null))
        {
            new UsingNamespaceMigration(Scanner()).Migrate(
                "Altinn.Platform.Profile.Models",
                "Altinn.App.Core.Models",
                AllCSharpFiles
            );
        }

        var migrated = _app.Read("logic/ProfileReader.cs");
        Assert.Single(Regex.Matches(migrated, "using Altinn.App.Core.Models;"));
        Assert.DoesNotContain("Altinn.Platform.Register", migrated);
        Assert.DoesNotContain("Altinn.Platform.Profile", migrated);
    }

    /// <summary>
    /// A namespace that merely shares the "Altinn.Platform.Register.Models" prefix by coincidence must
    /// not be touched by this migrator - it only matches the exact old namespace, not a prefix.
    /// </summary>
    [Fact]
    public void NamespaceMigration_LeavesUnrelatedNamespacesAlone()
    {
        _app.Write(
            "logic/Other.cs",
            """
            using Altinn.Platform.Register.Models.Extensions;
            public class Other { }
            """
        );

        MigratePartyNamespaces();

        Assert.Contains("using Altinn.Platform.Register.Models.Extensions;", _app.Read("logic/Other.cs"));
    }
}
