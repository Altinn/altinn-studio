using Altinn.Studio.StudioctlServer.Platform;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

/// <summary>Owns the workspace as long as its project is needed for semantic analysis or editing.</summary>
internal sealed class LoadedProject(Project project, IReadOnlyList<string> loadFailures, string? restoreError)
    : IDisposable
{
    public Project Project { get; } = project;
    public IReadOnlyList<string> LoadFailures { get; } = loadFailures;
    public string? RestoreError { get; } = restoreError;

    public void Dispose() => Project.Solution.Workspace.Dispose();
}

/// <summary>Shared restore and design-time build plumbing; callers decide whether the result is usable.</summary>
internal static class ProjectCompilationLoader
{
    public static async Task<LoadedProject> LoadAsync(
        string projectFolder,
        string projectFile,
        string? configuration,
        CancellationToken cancellationToken
    )
    {
        var restoreError = await RunRestoreAsync(projectFolder, projectFile, configuration, cancellationToken);
        MSBuildRegistration.EnsureRegistered();

        // The workspace API still needs in-process MSBuild assembly resolution. Actual design-time
        // builds run in its own build host, which selects the project's SDK and can run on a newer
        // runtime than studioctl-server itself.
        // Design-time builds normally omit unresolved assembly references without diagnostics.
        // Name simplification needs a complete reference graph, including unused plain References.
        var properties = new Dictionary<string, string>
        {
            ["ResolveAssemblyReferencesSilent"] = "false",
            ["DesignTimeSilentResolution"] = "false",
        };
        if (configuration is not null)
        {
            properties["Configuration"] = configuration;
        }
        var workspace = MSBuildWorkspace.Create(properties);
        try
        {
            var loadFailures = new List<string>();
            workspace.WorkspaceFailed += (_, args) =>
            {
                if (args.Diagnostic.Kind == WorkspaceDiagnosticKind.Failure)
                {
                    loadFailures.Add(args.Diagnostic.Message);
                }
            };

            var project = await workspace.OpenProjectAsync(projectFile, cancellationToken: cancellationToken);
            return new LoadedProject(project, loadFailures, restoreError);
        }
        catch
        {
            workspace.Dispose();
            throw;
        }
    }

    private static async Task<string?> RunRestoreAsync(
        string projectFolder,
        string projectFile,
        string? configuration,
        CancellationToken cancellationToken
    )
    {
        var (output, exitCode) = await DotnetRestore.RunAsync(
            projectFolder,
            projectFile,
            configuration,
            cancellationToken
        );
        if (exitCode == 0)
        {
            return null;
        }

        var error = DotnetRestore.FindError(output);
        return $"dotnet restore exited with {exitCode}{(error is null ? "" : $": {error}")}";
    }
}
