using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class UserProfileNamespaceMigrationTests : IDisposable
{
    private static readonly Regex AllCSharpFiles = new(@"\.cs$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private void MigrateUserProfileNamespace()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var migration = new UsingNamespaceMigration(Scanner());
        migration.Migrate("Altinn.Platform.Profile.Models", "Altinn.App.Core.Models", AllCSharpFiles);
    }

    [Fact]
    public void RewritesUserProfileNamespace()
    {
        _app.Write(
            "logic/ProfileReader.cs",
            """
            using Altinn.Platform.Profile.Models;
            public class ProfileReader
            {
                public string? Name(UserProfile profile) => profile.UserName;
            }
            """
        );

        MigrateUserProfileNamespace();

        var migrated = _app.Read("logic/ProfileReader.cs");
        Assert.Contains("using Altinn.App.Core.Models;", migrated);
        Assert.DoesNotContain("Altinn.Platform.Profile", migrated);
    }

    /// <summary>
    /// A file that already imports <c>Altinn.App.Core.Models</c> for something else (very common, since
    /// it's the App SDK's own model namespace) must end up with exactly one using for it, not two, once
    /// the old <c>Altinn.Platform.Profile.Models</c> using is also rewritten there.
    /// </summary>
    [Fact]
    public void DedupesWhenAppCoreModelsAlreadyImported()
    {
        _app.Write(
            "logic/ProfileAndApp.cs",
            """
            using Altinn.App.Core.Models;
            using Altinn.Platform.Profile.Models;
            public class ProfileAndApp
            {
                public string? Name(UserProfile profile, AppIdentifier app) => profile.UserName + app.App;
            }
            """
        );

        MigrateUserProfileNamespace();

        var migrated = _app.Read("logic/ProfileAndApp.cs");
        Assert.Single(Regex.Matches(migrated, "using Altinn.App.Core.Models;"));
        Assert.DoesNotContain("Altinn.Platform.Profile", migrated);
    }

    [Fact]
    public void LeavesUnrelatedNamespacesAlone()
    {
        _app.Write(
            "logic/Other.cs",
            """
            using Altinn.Platform.Profile.Models.Extensions;
            public class Other { }
            """
        );

        MigrateUserProfileNamespace();

        Assert.Contains("using Altinn.Platform.Profile.Models.Extensions;", _app.Read("logic/Other.cs"));
    }
}
