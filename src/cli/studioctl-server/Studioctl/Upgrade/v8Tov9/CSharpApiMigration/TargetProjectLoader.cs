using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>The target configurations and their workspaces, retained until simplification finishes.</summary>
internal sealed class TargetProjectAnalysis(IReadOnlyList<Project> projects, string? unavailableReason) : IDisposable
{
    public IReadOnlyList<Project> Projects { get; } = projects;
    public string? UnavailableReason { get; } = unavailableReason;

    public static TargetProjectAnalysis Unavailable(string reason) => new([], reason);

    public void Dispose()
    {
        foreach (var workspace in Projects.Select(project => project.Solution.Workspace).Distinct())
        {
            workspace.Dispose();
        }
    }
}

/// <summary>
/// Loads the updated project for optional name simplification. Both standard build configurations
/// must provide the target API; unrelated source errors from a partial upgrade are permitted.
/// </summary>
internal static class TargetProjectLoader
{
    public static Task<TargetProjectAnalysis> LoadAsync(
        string projectFolder,
        string projectFile,
        CancellationToken cancellationToken
    ) =>
        LoadAsync(
            (configuration, token) =>
                ProjectCompilationLoader.LoadAsync(projectFolder, projectFile, configuration, token),
            cancellationToken
        );

    internal static async Task<TargetProjectAnalysis> LoadAsync(
        Func<string, CancellationToken, Task<LoadedProject>> loadProject,
        CancellationToken cancellationToken
    )
    {
        var loadedProjects = new List<LoadedProject>();
        var completed = false;
        try
        {
            foreach (var configuration in new[] { "Debug", "Release" })
            {
                cancellationToken.ThrowIfCancellationRequested();
                var loaded = await loadProject(configuration, cancellationToken);
                loadedProjects.Add(loaded);
                if (loaded.LoadFailures.Count > 0)
                {
                    return TargetProjectAnalysis.Unavailable($"{configuration}: {loaded.LoadFailures[0]}");
                }
                var compilation = await loaded.Project.GetCompilationAsync(cancellationToken);
                var reason = EvaluateCompilation(compilation, loaded.RestoreError, cancellationToken);
                if (reason is not null)
                {
                    return TargetProjectAnalysis.Unavailable($"{configuration}: {reason}");
                }
            }

            completed = true;
            return new TargetProjectAnalysis(loadedProjects.Select(loaded => loaded.Project).ToArray(), null);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            return TargetProjectAnalysis.Unavailable(exception.Message);
        }
        finally
        {
            if (!completed)
            {
                foreach (var loaded in loadedProjects)
                {
                    loaded.Dispose();
                }
            }
        }
    }

    internal static string? EvaluateCompilation(
        Compilation? compilation,
        string? restoreError,
        CancellationToken cancellationToken
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (restoreError is not null)
        {
            return restoreError;
        }
        if (compilation is null)
        {
            return "the target project produced no compilation";
        }

        var cancellationTokenType = compilation.GetTypeByMetadataName("System.Threading.CancellationToken");
        if (
            compilation.GetSpecialType(SpecialType.System_Object).TypeKind == TypeKind.Error
            || cancellationTokenType is null
        )
        {
            return "the target framework references are unavailable";
        }

        // Assembly versions are not reliable for source ProjectReferences. This signature changed in
        // v9 and proves the actual target surface, whereas the Correspondence type also exists in v8.
        var calculator = compilation.GetTypeByMetadataName("Altinn.App.Core.Features.Payment.IOrderDetailsCalculator");
        if (
            !CSharpSemanticQueries.IsAltinnAppSymbol(calculator)
            || calculator
                ?.GetMembers("CalculateOrderDetails")
                .OfType<IMethodSymbol>()
                .Any(method =>
                    method.Parameters.Length == 3
                    && SymbolEqualityComparer.Default.Equals(method.Parameters[2].Type, cancellationTokenType)
                ) != true
        )
        {
            return "the compilation does not resolve the Altinn.App v9 API";
        }

        // Source errors can be useful TODOs after migration. Missing framework/assembly references
        // are different: they make name lookup incomplete even when the v9 probe happens to resolve.
        var referenceError = compilation
            .GetDiagnostics(cancellationToken)
            .FirstOrDefault(diagnostic =>
                diagnostic.Severity == DiagnosticSeverity.Error
                && diagnostic.Id is "CS0006" or "CS0012" or "CS0518" or "CS1069" or "CS1070" or "CS1705" or "CS7069"
            );
        return referenceError is null
            ? null
            : $"the target references are incomplete ({referenceError.Id}: {referenceError.GetMessage(System.Globalization.CultureInfo.InvariantCulture)})";
    }
}
