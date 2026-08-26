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
        migration.Migrate("Altinn.Platform.Register.Models", "Altinn.Register.Contracts.V1", AllCSharpFiles);
        migration.Migrate("Altinn.Platform.Register.Enums", "Altinn.Register.Contracts.V1", AllCSharpFiles);
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
        Assert.Contains("using Altinn.Register.Contracts.V1;", migrated);
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
        Assert.Single(Regex.Matches(migrated, "using Altinn.Register.Contracts.V1;"));
        Assert.DoesNotContain("Altinn.Platform.Register", migrated);
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

    // --- PartyChildPartiesMigration (auto-rewrite the safe case) ---------------------------------

    [Fact]
    public void ChildPartiesMigration_WidensListDeclarationInitializedFromChildParties()
    {
        _app.Write(
            "logic/Hierarchy.cs",
            """
            using Altinn.Register.Contracts.V1;
            public class Hierarchy
            {
                public int Count(Party party)
                {
                    List<Party> children = party.ChildParties;
                    return children.Count;
                }
            }
            """
        );

        var result = new PartyChildPartiesMigration(Scanner()).Migrate();
        var migrated = _app.Read("logic/Hierarchy.cs");

        Assert.Contains("IReadOnlyList<Party> children = party.ChildParties;", migrated);
        Assert.Empty(result.Todos);
        Assert.NotEmpty(result.Warnings);
    }

    [Fact]
    public void ChildPartiesMigration_LeavesUnrelatedListDeclarationsAlone()
    {
        var source = """
            using Altinn.Register.Contracts.V1;
            public class Hierarchy
            {
                public List<Party> All(Party party) => new() { party };
            }
            """;

        _app.Write("logic/Unrelated.cs", source);

        var result = new PartyChildPartiesMigration(Scanner()).Migrate();

        Assert.Equal(source, _app.Read("logic/Unrelated.cs"));
        Assert.Empty(result.Warnings);
        Assert.Empty(result.Todos);
    }

    // --- PartyChildPartiesMigration (report the mutation case) -----------------------------------

    [Fact]
    public void ChildPartiesMigration_ReportsDirectMutationOfChildParties()
    {
        _app.Write(
            "logic/Mutator.cs",
            """
            using Altinn.Register.Contracts.V1;
            public class Mutator
            {
                public void Prune(Party party, Party toRemove)
                {
                    party.ChildParties.Remove(toRemove);
                }
            }
            """
        );

        var result = new PartyChildPartiesMigration(Scanner()).Migrate();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("Mutator.cs") && w.Contains(".ChildParties.Remove(..)"));
        // Left untouched - IReadOnlyList<Party> has no Remove, and there is no single safe rewrite.
        Assert.Contains("party.ChildParties.Remove(toRemove);", _app.Read("logic/Mutator.cs"));
    }

    [Fact]
    public void ChildPartiesMigration_ReportsElementAssignmentIntoChildParties()
    {
        _app.Write(
            "logic/Replacer.cs",
            """
            using Altinn.Register.Contracts.V1;
            public class Replacer
            {
                public void ReplaceFirst(Party party, Party replacement)
                {
                    party.ChildParties[0] = replacement;
                }
            }
            """
        );

        var result = new PartyChildPartiesMigration(Scanner()).Migrate();

        Assert.NotEmpty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("Replacer.cs") && w.Contains(".ChildParties[..] = .."));
    }

    [Fact]
    public void ChildPartiesMigration_IsIdempotent()
    {
        _app.Write(
            "logic/Hierarchy.cs",
            """
            using Altinn.Register.Contracts.V1;
            public class Hierarchy
            {
                public int Count(Party party)
                {
                    List<Party> children = party.ChildParties;
                    return children.Count;
                }
            }
            """
        );

        new PartyChildPartiesMigration(Scanner()).Migrate();
        var afterFirst = _app.Read("logic/Hierarchy.cs");

        var second = new PartyChildPartiesMigration(Scanner()).Migrate();
        var afterSecond = _app.Read("logic/Hierarchy.cs");

        Assert.Equal(afterFirst, afterSecond);
        Assert.Empty(second.Warnings);
    }
}
