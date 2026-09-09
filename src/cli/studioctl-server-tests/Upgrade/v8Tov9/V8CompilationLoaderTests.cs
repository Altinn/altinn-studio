using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the usability gates that decide between exact semantic detection and the syntax fallback
/// (<see cref="V8CompilationLoader.EvaluateCompilation"/>). The restore/design-time-build plumbing
/// around them needs a real SDK and network and is exercised manually; the gates are what encode the
/// "graceful fallback" contract, so they are pinned offline here.
/// </summary>
public sealed class V8CompilationLoaderTests
{
    private const string ProbeTypeSource = """
        namespace Altinn.App.Core.Features
        {
            public interface IProcessTaskEnd { }
        }
        """;

    private static Compilation Compile(params string[] sources) =>
        CSharpCompilation.Create(
            "Altinn.Application",
            sources.Select(static source => CSharpSyntaxTree.ParseText(source)),
            references: null,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

    [Fact]
    public void NullCompilation_FallsBack()
    {
        var result = V8CompilationLoader.EvaluateCompilation(null, [], null, CancellationToken.None);

        Assert.Null(result.Compilation);
        Assert.Contains("no compilation", result.UnavailableReason);
    }

    [Fact]
    public void MissingProbeType_FallsBack_WithTheLoadFailureAsContext()
    {
        // A degraded design-time build returns a compilation with no usable references; the probe
        // type is what rejects it, and the workspace's failure diagnostic is the context.
        var result = V8CompilationLoader.EvaluateCompilation(
            Compile("public class App { }"),
            ["Msbuild failed: The TargetFramework value '' was not recognized"],
            "dotnet restore exited with 1",
            CancellationToken.None
        );

        Assert.Null(result.Compilation);
        Assert.Contains("does not resolve the Altinn.App v8 API", result.UnavailableReason);
        Assert.Contains("TargetFramework", result.UnavailableReason);
    }

    [Fact]
    public void MissingProbeType_FallsBack_WithTheRestoreErrorAsContext()
    {
        var result = V8CompilationLoader.EvaluateCompilation(
            Compile("public class App { }"),
            [],
            "dotnet restore exited with 1: error NU1301: Unable to load the service index",
            CancellationToken.None
        );

        Assert.Null(result.Compilation);
        Assert.Contains("NU1301", result.UnavailableReason);
    }

    [Fact]
    public void CompileErrors_FallBack_NamingTheFirstError()
    {
        // References are deliberately absent, so `object` etc. do not resolve - any error works; the
        // contract is that binding never runs against half-broken code, and the reason is actionable.
        var result = V8CompilationLoader.EvaluateCompilation(
            Compile(ProbeTypeSource, "public class Broken { public Missing Field; }"),
            [],
            null,
            CancellationToken.None
        );

        Assert.Null(result.Compilation);
        Assert.Contains("does not compile before the upgrade", result.UnavailableReason);
        Assert.Contains("CS", result.UnavailableReason);
    }

    [Fact]
    public void UsableCompilation_IsReturned()
    {
        var trustedAssemblies =
            AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
            ?? throw new InvalidOperationException("TRUSTED_PLATFORM_ASSEMBLIES not available");
        var runtimeReferences = trustedAssemblies
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
            .Select(static path => (MetadataReference)MetadataReference.CreateFromFile(path));

        var compilation = CSharpCompilation.Create(
            "Altinn.Application",
            [CSharpSyntaxTree.ParseText(ProbeTypeSource, cancellationToken: TestContext.Current.CancellationToken)],
            runtimeReferences,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

        var result = V8CompilationLoader.EvaluateCompilation(
            compilation,
            [],
            null,
            TestContext.Current.CancellationToken
        );

        Assert.NotNull(result.Compilation);
        Assert.Null(result.UnavailableReason);
    }
}
