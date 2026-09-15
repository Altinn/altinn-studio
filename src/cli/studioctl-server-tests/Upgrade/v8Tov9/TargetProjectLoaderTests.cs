using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Host.Mef;
using Microsoft.CodeAnalysis.Text;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class TargetProjectLoaderTests
{
    /// <summary>
    /// The one API the loader keys on, in its v8 or v9 shape. Deriving one from the other by text
    /// replacement would depend on the line endings this source file was checked out with.
    /// </summary>
    private static string Api(bool v9)
    {
        var token = v9 ? ", System.Threading.CancellationToken cancellationToken = default" : "";
        return $$"""
            namespace Altinn.App.Core.Features.Payment
            {
                public interface IOrderDetailsCalculator
                {
                    void CalculateOrderDetails(object instance, string language{{token}});
                }
            }
            """;
    }

    private static readonly string V9Api = Api(v9: true);

    private static readonly MetadataReference[] RuntimeReferences =
    [
        .. (
            AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
            ?? throw new InvalidOperationException("Runtime references unavailable")
        )
            .Split(Path.PathSeparator)
            .Select(path => MetadataReference.CreateFromFile(path)),
    ];

    private static readonly MetadataReference V9Reference = SemanticScannerFactory.EmitStubAssembly(
        "Altinn.App.Core",
        V9Api
    );
    private static readonly MetadataReference V8Reference = SemanticScannerFactory.EmitStubAssembly(
        "Altinn.App.Core",
        Api(v9: false)
    );

    [Fact]
    public void TargetApi_WithUnrelatedSourceError_IsUsable()
    {
        var compilation = Compile("public class App { MissingType ManualMigration; }", V9Reference);
        Assert.Contains(
            compilation.GetDiagnostics(TestContext.Current.CancellationToken),
            diagnostic => diagnostic.Id == "CS0246"
        );

        Assert.Null(TargetProjectLoader.EvaluateCompilation(compilation, null, TestContext.Current.CancellationToken));
    }

    [Fact]
    public void FailedRestore_RejectsEvenAUsableStaleCompilation()
    {
        var reason = TargetProjectLoader.EvaluateCompilation(
            Compile("", V9Reference),
            "dotnet restore exited with 1: NU1301",
            TestContext.Current.CancellationToken
        );

        Assert.Contains("NU1301", reason);
    }

    [Fact]
    public void OldApi_AndAppDeclaredLookalike_AreNotTargetReferences()
    {
        var oldApi = Compile("", V8Reference);
        var lookalike = Compile(V9Api);

        Assert.Contains(
            "v9 API",
            TargetProjectLoader.EvaluateCompilation(oldApi, null, TestContext.Current.CancellationToken)
        );
        Assert.Contains(
            "v9 API",
            TargetProjectLoader.EvaluateCompilation(lookalike, null, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public void MissingFramework_RejectsTheCompilation()
    {
        var compilation = CSharpCompilation.Create("App", references: [V9Reference]);

        Assert.Contains(
            "framework references",
            TargetProjectLoader.EvaluateCompilation(compilation, null, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public void MissingTransitiveReference_RejectsOtherwiseUsableTargetApi()
    {
        var dependency = SemanticScannerFactory.EmitStubAssembly("Dependency", "public class Dependency { }");
        var sdk = CSharpCompilation.Create(
            "Altinn.App.Core",
            [
                CSharpSyntaxTree.ParseText(
                    V9Api + "public static class Api { public static void Use(Dependency value) { } }",
                    cancellationToken: TestContext.Current.CancellationToken
                ),
            ],
            [.. RuntimeReferences, dependency],
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
        using var assembly = new MemoryStream();
        Assert.True(sdk.Emit(assembly, cancellationToken: TestContext.Current.CancellationToken).Success);
        var compilation = Compile(
            "public class App { public void M() { Api.Use(null); } }",
            MetadataReference.CreateFromImage(assembly.ToArray())
        );

        Assert.Contains(
            "CS0012",
            TargetProjectLoader.EvaluateCompilation(compilation, null, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task MissingUnusedAssembly_IsReportedByMsbuild_AndPreventsSimplification()
    {
        using var app = new TempAppFolder();
        app.Write("../NuGet.Config", "<configuration><packageSources><clear /></packageSources></configuration>");
        app.Write(
            "../Core/Core.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <AssemblyName>Altinn.App.Core</AssemblyName>
                <NuGetAudit>false</NuGetAudit>
              </PropertyGroup>
            </Project>
            """
        );
        app.Write("../Core/Api.cs", V9Api);
        var projectFile = app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk">
              <PropertyGroup>
                <TargetFramework>net10.0</TargetFramework>
                <NuGetAudit>false</NuGetAudit>
              </PropertyGroup>
              <ItemGroup>
                <ProjectReference Include="../Core/Core.csproj" />
                <Reference Include="Shared"><HintPath>Shared.dll</HintPath></Reference>
              </ItemGroup>
            </Project>
            """
        );
        app.Write("App.cs", "public class App { public global::System.Threading.CancellationToken Token; }");

        using var loaded = await ProjectCompilationLoader.LoadAsync(
            Path.Combine(app.Root, "App"),
            projectFile,
            "Debug",
            TestContext.Current.CancellationToken
        );
        var compilation = Assert.IsAssignableFrom<Compilation>(
            await loaded.Project.GetCompilationAsync(TestContext.Current.CancellationToken)
        );
        Assert.Null(loaded.RestoreError);
        Assert.Empty(
            compilation
                .GetDiagnostics(TestContext.Current.CancellationToken)
                .Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
        );
        Assert.Null(TargetProjectLoader.EvaluateCompilation(compilation, null, TestContext.Current.CancellationToken));
        // The compiler cannot diagnose a reference MSBuild omitted. The unsilenced load must report it
        // even though this source does not use Shared yet; that assembly can introduce colliding names.
        Assert.Contains(loaded.LoadFailures, failure => failure.Contains("Shared", StringComparison.Ordinal));

        using var analysis = await TargetProjectLoader.LoadAsync(
            (_, _) => Task.FromResult(loaded),
            TestContext.Current.CancellationToken
        );
        Assert.Empty(analysis.Projects);
        Assert.Contains("Shared", analysis.UnavailableReason);
    }

    [Fact]
    public async Task BothConfigurations_AreKeptAliveUntilAnalysisIsDisposed()
    {
        using var debug = new TrackingWorkspace();
        using var release = new TrackingWorkspace();
        var configurations = new List<string>();
        using var analysis = await TargetProjectLoader.LoadAsync(
            (configuration, _) =>
            {
                configurations.Add(configuration);
                return Task.FromResult(CreateLoaded(configuration == "Debug" ? debug : release, V9Reference));
            },
            TestContext.Current.CancellationToken
        );

        Assert.Equal(["Debug", "Release"], configurations);
        Assert.Equal(2, analysis.Projects.Count);
        Assert.Null(analysis.UnavailableReason);
        Assert.False(debug.IsDisposed);
        Assert.False(release.IsDisposed);
        analysis.Dispose();
        Assert.True(debug.IsDisposed);
        Assert.True(release.IsDisposed);
    }

    [Fact]
    public async Task UnusableRelease_DiscardsAndDisposesBothConfigurations()
    {
        using var debug = new TrackingWorkspace();
        using var release = new TrackingWorkspace();
        using var analysis = await TargetProjectLoader.LoadAsync(
            (configuration, _) =>
                Task.FromResult(
                    configuration == "Debug" ? CreateLoaded(debug, V9Reference) : CreateLoaded(release, V8Reference)
                ),
            TestContext.Current.CancellationToken
        );

        Assert.Empty(analysis.Projects);
        Assert.StartsWith("Release:", analysis.UnavailableReason);
        Assert.True(debug.IsDisposed);
        Assert.True(release.IsDisposed);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task InterruptedRelease_DisposesDebug_AndPropagatesOnlyCancellation(bool canceled)
    {
        using var debug = new TrackingWorkspace();
        Task<LoadedProject> Load(string configuration, CancellationToken _)
        {
            if (configuration == "Debug")
            {
                return Task.FromResult(CreateLoaded(debug, V9Reference));
            }
            if (canceled)
            {
                throw new OperationCanceledException();
            }
            throw new InvalidOperationException("MSBuild unavailable");
        }

        if (canceled)
        {
            await Assert.ThrowsAsync<OperationCanceledException>(() =>
                TargetProjectLoader.LoadAsync(Load, TestContext.Current.CancellationToken)
            );
        }
        else
        {
            using var analysis = await TargetProjectLoader.LoadAsync(Load, TestContext.Current.CancellationToken);
            Assert.Empty(analysis.Projects);
            Assert.Contains("MSBuild unavailable", analysis.UnavailableReason);
        }
        Assert.True(debug.IsDisposed);
    }

    private static CSharpCompilation Compile(string source, params MetadataReference[] references) =>
        CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(source)],
            [.. RuntimeReferences, .. references],
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );

    private static LoadedProject CreateLoaded(Workspace workspace, MetadataReference reference)
    {
        var id = ProjectId.CreateNewId();
        var project =
            workspace
                .CurrentSolution.AddProject(id, "App", "App", LanguageNames.CSharp)
                .WithProjectCompilationOptions(id, new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary))
                .WithProjectMetadataReferences(id, [.. RuntimeReferences, reference])
                .AddDocument(DocumentId.CreateNewId(id), "App.cs", SourceText.From("public class App { }"))
                .GetProject(id)
            ?? throw new InvalidOperationException("Fixture project unavailable");
        return new LoadedProject(project, [], null);
    }

    private sealed class TrackingWorkspace() : Workspace(MefHostServices.DefaultHost, "Test")
    {
        public bool IsDisposed { get; private set; }

        protected override void Dispose(bool finalize)
        {
            IsDisposed = true;
            base.Dispose(finalize);
        }
    }
}
