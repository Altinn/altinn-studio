using System.Diagnostics;
using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>
/// The outcome of trying to compile the app against its current (v8) packages: either a usable
/// <see cref="Compilation"/>, or the reason there is none and detection falls back to syntax.
/// </summary>
internal sealed record SemanticAnalysis(Compilation? Compilation, string? UnavailableReason)
{
    public static SemanticAnalysis Unavailable(string reason) => new(null, reason);
}

/// <summary>
/// Restores and compiles the app against its <em>current</em> (v8) packages, before the upgrade bumps
/// the csproj. The ordering matters: the symbols the detectors hunt are precisely the ones v9 removes,
/// so only the v8 dependency graph resolves them — a post-bump compilation would bind them to error
/// symbols and buy nothing.
/// <para>
/// Failure is a normal outcome, not an error: the app may not compile before the upgrade either, the
/// machine may lack the SDK/targeting pack the app targets (doctor only checks the major version), a
/// <c>global.json</c> may pin an absent SDK, or the machine may be offline. Every failure degrades to
/// the syntax-based detection that was previously the only mode, with the reason reported.
/// </para>
/// <para>
/// Uses <see cref="Microsoft.CodeAnalysis.MSBuild.MSBuildWorkspace"/>, which the server already ships (and already uses in the v7-&gt;v8
/// upgrade); the MSBuild machinery runs in an out-of-process BuildHost, so nothing heavy loads into
/// the server process.
/// </para>
/// </summary>
internal static class V8CompilationLoader
{
    /// <summary>
    /// A public v8 type removed in v9. Resolving it proves both that the compilation has real
    /// references (a degraded design-time build yields none) and that those references are the v8
    /// surface — an in-repo app on ProjectReferences compiles against the local v9 source, where
    /// semantic detection of removed symbols would silently find nothing.
    /// </summary>
    private const string V8ProbeTypeMetadataName = "Altinn.App.Core.Features.IProcessTaskEnd";

    private const string StepName = "Semantic analysis";

    public static Task<SemanticAnalysis> LoadAsync(
        string projectFolder,
        string projectFile,
        CancellationToken cancellationToken
    ) => LoadAsync(() => LoadCoreAsync(projectFolder, projectFile, cancellationToken));

    /// <summary>
    /// Runs <paramref name="loadCore"/> and reports its outcome as the <c>Semantic analysis</c> step of
    /// the current upgrade run. Separated from the restore/design-time-build plumbing so the reporting
    /// can be exercised without an SDK or network.
    /// </summary>
    internal static async Task<SemanticAnalysis> LoadAsync(Func<Task<SemanticAnalysis>> loadCore)
    {
        UpgradeConsole.BeginStep(StepName);
        var timer = Stopwatch.StartNew();
        SemanticAnalysis result;
        try
        {
            result = await loadCore();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            result = SemanticAnalysis.Unavailable(exception.Message);
        }
        timer.Stop();

        if (result.Compilation is not null)
        {
            UpgradeConsole.Ok(
                $"Compiled the app against its current packages in {timer.Elapsed.TotalSeconds:0.0}s - "
                    + "detection uses exact symbol information."
            );
        }
        else
        {
            UpgradeConsole.Warning(
                $"Semantic analysis unavailable after {timer.Elapsed.TotalSeconds:0.0}s - falling back to "
                    + $"syntax-based detection ({result.UnavailableReason}). The upgrade still runs; detection "
                    + "may over-report."
            );
        }
        return result;
    }

    private static async Task<SemanticAnalysis> LoadCoreAsync(
        string projectFolder,
        string projectFile,
        CancellationToken cancellationToken
    )
    {
        using var loaded = await ProjectCompilationLoader.LoadAsync(
            projectFolder,
            projectFile,
            configuration: null,
            cancellationToken
        );
        var compilation = await loaded.Project.GetCompilationAsync(cancellationToken);
        return EvaluateCompilation(compilation, loaded.LoadFailures, loaded.RestoreError, cancellationToken);
    }

    /// <summary>
    /// Decides whether the compilation is usable for exact detection. Factored out of the load so the
    /// gates are testable without a restore: <c>OpenProjectAsync</c> does not throw on a degraded load,
    /// so a compilation can come back non-null but missing every metadata reference — the probe type
    /// decides usability, and any compile error falls back rather than binding against half-broken code.
    /// </summary>
    internal static SemanticAnalysis EvaluateCompilation(
        Compilation? compilation,
        IReadOnlyList<string> loadFailures,
        string? restoreError,
        CancellationToken cancellationToken
    )
    {
        if (compilation is null)
        {
            return SemanticAnalysis.Unavailable("the project produced no compilation");
        }

        if (compilation.GetTypeByMetadataName(V8ProbeTypeMetadataName) is null)
        {
            var context = "is the app on v8 packages, and is the SDK the app targets installed?";
            if (loadFailures.Count > 0)
            {
                context = loadFailures[0];
            }
            else if (restoreError is not null)
            {
                context = restoreError;
            }
            return SemanticAnalysis.Unavailable($"the compilation does not resolve the Altinn.App v8 API ({context})");
        }

        var errors = compilation
            .GetDiagnostics(cancellationToken)
            .Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error)
            .ToList();
        if (errors.Count > 0)
        {
            // The first error makes the reason actionable; the count says whether it is the only one.
            var first = errors[0];
            return SemanticAnalysis.Unavailable(
                $"the app does not compile before the upgrade ({errors.Count} error(s), first: "
                    + $"{first.Id} {first.GetMessage(System.Globalization.CultureInfo.InvariantCulture)}); "
                    + "fix the build or proceed with syntax-based detection"
            );
        }

        return new SemanticAnalysis(compilation, null);
    }
}
