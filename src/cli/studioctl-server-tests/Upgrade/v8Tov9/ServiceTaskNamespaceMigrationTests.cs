using System.Text.RegularExpressions;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the IServiceTask namespace rewrite (reuses <see cref="UsingNamespaceMigration"/> across the
/// whole app source tree), including that build output is left untouched.
/// </summary>
public sealed class ServiceTaskNamespaceMigrationTests : IDisposable
{
    private const string OldNamespace = "Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks";
    private const string NewNamespace = "Altinn.App.Core.Features.Process";
    private static readonly Regex AllCs = new(@"\.cs$");

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private void Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        var projectFile = Path.Combine(_app.Root, "App", "App.csproj");
        new UsingNamespaceMigration(projectFile).Migrate(OldNamespace, NewNamespace, AllCs);
    }

    [Fact]
    public void RewritesUsingAcrossAllSourceFiles()
    {
        var a = _app.Write("logic/A.cs", $"using {OldNamespace};\npublic class A {{}}\n");
        var b = _app.Write("services/B.cs", $"using {OldNamespace};\npublic class B {{}}\n");

        Migrate();

        Assert.Contains($"using {NewNamespace};", File.ReadAllText(a));
        Assert.DoesNotContain(OldNamespace, File.ReadAllText(a));
        Assert.Contains($"using {NewNamespace};", File.ReadAllText(b));
    }

    [Fact]
    public void LeavesBuildOutputUntouched()
    {
        var generated = _app.Write("obj/Debug/Generated.cs", $"using {OldNamespace};\npublic class G {{}}\n");

        Migrate();

        Assert.Contains($"using {OldNamespace};", File.ReadAllText(generated));
    }
}
