using System.Collections.Immutable;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using Buildalyzer;
using Buildalyzer.Environment;
using Buildalyzer.Workspaces;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.Extensions.Logging;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests.Fixtures;

public abstract class BaseFixture : IDisposable
{
    private ITestOutputHelper? _output;
    public string? ProjectDir;
    public AdhocWorkspace? Workspace;
    public Project? Project;

    [
        MemberNotNullWhen(true, nameof(ProjectDir)),
        MemberNotNullWhen(true, nameof(Workspace)),
        MemberNotNullWhen(true, nameof(Project))
    ]
    public bool IsInitialized { get; set; }

    public void SetTestOutputHelper(ITestOutputHelper output) => _output = output;

    public ITestOutputHelper Output => _output ?? throw new InvalidOperationException("Fixture not initialized yet");

    private static readonly SemaphoreSlim _lck = new SemaphoreSlim(1, 1);

    protected async Task Init(string projectFilePath, string? preBuildTarget = null)
    {
        if (IsInitialized)
            return;

        var output = Output;
        var timer = Stopwatch.StartNew();
        await _lck.WaitAsync();
        try
        {
            if (IsInitialized)
                return;
            ProjectDir = Path.GetDirectoryName(projectFilePath);
            Assert.True(Directory.Exists(ProjectDir));
            StringWriter log = new StringWriter();
            var manager = new AnalyzerManager(new AnalyzerManagerOptions { LogWriter = log });

            var logger = manager.LoggerFactory?.CreateLogger<AdhocWorkspace>();
            Workspace = new AdhocWorkspace();
            Workspace.WorkspaceChanged += (sender, args) => Output.WriteLine("Workspace changed: {0}", args.Kind);
            Workspace.WorkspaceFailed += (sender, args) => Output.WriteLine("Workspace failed: {0}", args.Diagnostic);

            var analyzer = manager.GetProject(projectFilePath);
            var options = new EnvironmentOptions() { DesignTime = false };
            options.TargetsToBuild.Clear();
            var targets = new List<string> { "Clean", "Build" };
            if (preBuildTarget != null)
                targets.Insert(1, preBuildTarget);
            options.TargetsToBuild.AddRange(targets);
            var results = analyzer.Build(options);
            var result =
                results
                    .OrderByDescending(r => !string.IsNullOrWhiteSpace(r.TargetFramework))
                    .FirstOrDefault(r => r.Succeeded)
                ?? results.First();
            Assert.True(result.Succeeded, log.ToString());
            Project = result.AddToWorkspace(Workspace);

            Assert.True(Workspace.CanApplyChange(ApplyChangesKind.AddDocument));
            Assert.True(Workspace.CanApplyChange(ApplyChangesKind.RemoveDocument));
            Assert.True(Workspace.CanApplyChange(ApplyChangesKind.ChangeDocument));
            IsInitialized = true;

            timer.Stop();
            output.WriteLine($"Initialized fixture - took {timer.Elapsed.TotalSeconds:0.000}s");
            output.WriteLine("Logs:");
            output.WriteLine(log.ToString());
        }
        catch (Exception ex)
        {
            timer.Stop();
            output.WriteLine($"Error initializing fixture (took {timer.Elapsed.TotalSeconds:0.000}s): {ex}");
            throw;
        }
        finally
        {
            _lck.Release();
        }
    }

    protected async Task<(
        CompilationWithAnalyzers Compilation,
        IReadOnlyList<Diagnostic> Diagnostics
    )> CompileWithAnalyzer(DiagnosticAnalyzer analyzer, CancellationToken cancellationToken)
    {
        if (!IsInitialized)
            throw new InvalidOperationException("Fixture not initialized");

        await _lck.WaitAsync(cancellationToken);
        try
        {
            var compilation = await Project.GetCompilationAsync(cancellationToken);
            Assert.NotNull(compilation);

            var options = new CompilationWithAnalyzersOptions(
                new AnalyzerOptions(ImmutableArray<AdditionalText>.Empty),
                static (ex, analyzer, diagnostic) => Assert.Fail($"Analyzer exception due to {diagnostic.Id}: {ex}"),
                concurrentAnalysis: true,
                logAnalyzerExecutionTime: true
            );

            var compilationWithAnalyzers = compilation.WithAnalyzers([analyzer], options);

            Assert.NotNull(compilationWithAnalyzers);
            var diagnostics = await compilationWithAnalyzers.GetAllDiagnosticsAsync(cancellationToken);
            return (compilationWithAnalyzers, diagnostics);
        }
        finally
        {
            _lck.Release();
        }
    }

    public void Dispose()
    {
        Workspace?.Dispose();
        GC.SuppressFinalize(this);
    }
}
