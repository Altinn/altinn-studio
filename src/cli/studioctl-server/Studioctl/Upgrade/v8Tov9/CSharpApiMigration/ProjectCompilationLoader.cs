using System.Diagnostics;
using Altinn.Studio.StudioctlServer.Platform;
using Microsoft.Build.Locator;
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
        if (!MSBuildLocator.IsRegistered)
        {
            MSBuildLocator.RegisterDefaults();
        }

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
        var startInfo = ProcessUtil.CreateStartInfo("dotnet", "restore", projectFile);
        if (configuration is not null)
        {
            startInfo.ArgumentList.Add($"-p:Configuration={configuration}");
        }
        startInfo.WorkingDirectory = projectFolder;
        startInfo.RedirectStandardOutput = true;
        startInfo.RedirectStandardError = true;

        using var process =
            Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start dotnet restore.");
        var standardOutput = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var standardError = process.StandardError.ReadToEndAsync(cancellationToken);
        try
        {
            await process.WaitForExitAsync(cancellationToken);
        }
        catch (OperationCanceledException)
        {
            // WaitForExitAsync only stops waiting; terminate the restore too.
            try
            {
                process.Kill(entireProcessTree: true);
            }
            catch (InvalidOperationException)
            {
                // The process exited between cancellation and the kill.
            }
            throw;
        }

        var error = (await standardError).Trim();
        var output = (await standardOutput).Trim();
        if (process.ExitCode == 0)
        {
            return null;
        }

        var detail = error.Length > 0 ? error : output;
        var lastLine = detail.Split('\n', StringSplitOptions.RemoveEmptyEntries).LastOrDefault()?.Trim();
        return $"dotnet restore exited with {process.ExitCode}{(lastLine is null ? "" : $": {lastLine}")}";
    }
}
