using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Applies patches using git apply
/// </summary>
internal class GitPatchApplier
{
    private readonly string _repositoryRoot;

    public GitPatchApplier(string repositoryRoot)
    {
        _repositoryRoot = repositoryRoot;
    }

    /// <summary>
    /// Apply a patch using git apply
    /// </summary>
    public PatchApplicationResult ApplyPatch(string patchContent)
    {
        // First validate the patch
        if (!ValidatePatch(patchContent))
        {
            return new PatchApplicationResult { Success = false, ErrorOutput = "Patch validation failed" };
        }

        // Apply the patch (already reversed by ReversePatchGenerator, don't use --reverse flag)
        var result = ExecuteGitCommand("apply -", patchContent);

        return new PatchApplicationResult
        {
            Success = result.ExitCode == 0,
            Output = result.StandardOutput,
            ErrorOutput = result.StandardError,
            FilesModified = new List<string>(),
        };
    }

    /// <summary>
    /// Validate patch before applying (dry-run)
    /// </summary>
    public bool ValidatePatch(string patchContent)
    {
        var result = ExecuteGitCommand("apply --check -", patchContent);
        return result.ExitCode == 0;
    }

    /// <summary>
    /// Execute git command and capture output
    /// </summary>
    private ProcessResult ExecuteGitCommand(string arguments, string? input = null)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "git",
            Arguments = arguments,
            WorkingDirectory = _repositoryRoot,
            RedirectStandardInput = input != null,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        try
        {
            using var process = Process.Start(startInfo);

            if (process == null)
            {
                throw new InvalidOperationException("Failed to start git process");
            }

            if (input != null)
            {
                process.StandardInput.Write(input);
                process.StandardInput.Close();
            }

            string output = process.StandardOutput.ReadToEnd();
            string error = process.StandardError.ReadToEnd();
            process.WaitForExit();

            return new ProcessResult
            {
                ExitCode = process.ExitCode,
                StandardOutput = output,
                StandardError = error,
            };
        }
        catch (Exception ex)
        {
            return new ProcessResult
            {
                ExitCode = -1,
                StandardOutput = string.Empty,
                StandardError = $"Failed to execute git command: {ex.Message}",
            };
        }
    }
}

/// <summary>
/// Result of applying a patch
/// </summary>
internal class PatchApplicationResult
{
    public bool Success { get; set; }
    public string Output { get; set; } = string.Empty;
    public string ErrorOutput { get; set; } = string.Empty;
    public List<string> FilesModified { get; set; } = new List<string>();
}

/// <summary>
/// Result of executing a process
/// </summary>
internal class ProcessResult
{
    public int ExitCode { get; set; }
    public string StandardOutput { get; set; } = string.Empty;
    public string StandardError { get; set; } = string.Empty;
}
