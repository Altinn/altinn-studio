using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Main orchestrator for restoring whitespace-only changes
/// </summary>
internal class WhitespaceRestorationProcessor
{
    private readonly string _repositoryRoot;
    private readonly string _layoutsPath;
    private readonly string _layoutsPathRelativeToRepo;

    public WhitespaceRestorationProcessor(string layoutsPath)
    {
        _layoutsPath = layoutsPath;
        _repositoryRoot = FindGitRepositoryRoot(layoutsPath);

        // Convert layouts path to be relative to repository root
        var fullLayoutsPath = Path.GetFullPath(layoutsPath);
        _layoutsPathRelativeToRepo = Path.GetRelativePath(_repositoryRoot, fullLayoutsPath);
    }

    /// <summary>
    /// Main entry point: Restore whitespace-only changes in modified layout files
    /// </summary>
    public WhitespaceRestorationResult RestoreWhitespaceOnlyChanges()
    {
        var result = new WhitespaceRestorationResult { Success = true };

        try
        {
            // Get modified layout files
            var modifiedFiles = GetModifiedLayoutFiles();
            result.TotalFilesProcessed = modifiedFiles.Count;

            if (modifiedFiles.Count == 0)
            {
                return result;
            }

            // Parse diffs for each file
            var diffParser = new DiffParser();
            var classifier = new ChunkClassifier();
            var allDiffFiles = new List<DiffFile>();
            var allClassifications = new Dictionary<DiffHunk, ChunkClassification>();

            foreach (var filePath in modifiedFiles)
            {
                try
                {
                    var diffOutput = GenerateUnifiedDiff(filePath);
                    if (string.IsNullOrWhiteSpace(diffOutput))
                    {
                        continue;
                    }

                    var diffFile = diffParser.ParseUnifiedDiff(diffOutput, filePath);
                    allDiffFiles.Add(diffFile);

                    // Classify each hunk
                    foreach (var hunk in diffFile.Hunks)
                    {
                        result.TotalHunksAnalyzed++;
                        var classification = classifier.ClassifyHunk(hunk);
                        allClassifications[hunk] = classification;

                        if (classification.IsWhitespaceOnly)
                        {
                            result.WhitespaceOnlyHunksFound++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    result.Warnings.Add($"Failed to process file {filePath}: {ex.Message}");
                }
            }

            // Generate and apply reverse patch
            if (result.WhitespaceOnlyHunksFound > 0)
            {
                try
                {
                    var patchGenerator = new ReversePatchGenerator();
                    var patchContent = patchGenerator.GenerateReversePatch(allDiffFiles, allClassifications);

                    if (!string.IsNullOrWhiteSpace(patchContent))
                    {
                        var patchApplier = new GitPatchApplier(_repositoryRoot);
                        var patchResult = patchApplier.ApplyPatch(patchContent);

                        if (patchResult.Success)
                        {
                            result.HunksReverted = result.WhitespaceOnlyHunksFound;
                        }
                        else
                        {
                            result.Success = false;
                            result.Errors.Add($"Failed to apply patch: {patchResult.ErrorOutput}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    result.Success = false;
                    result.Errors.Add($"Failed to generate or apply patch: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Errors.Add($"Whitespace restoration failed: {ex.Message}");
        }

        return result;
    }

    /// <summary>
    /// Find the git repository root by walking up the directory tree
    /// </summary>
    private string FindGitRepositoryRoot(string startPath)
    {
        var currentPath = Path.GetFullPath(startPath);

        while (!string.IsNullOrEmpty(currentPath))
        {
            var gitPath = Path.Combine(currentPath, ".git");
            if (Directory.Exists(gitPath) || File.Exists(gitPath))
            {
                return currentPath;
            }

            var parentPath = Directory.GetParent(currentPath)?.FullName;
            if (parentPath == currentPath)
            {
                break;
            }
            currentPath = parentPath ?? string.Empty;
        }

        throw new InvalidOperationException($"Could not find git repository root starting from {startPath}");
    }

    /// <summary>
    /// Get list of modified JSON files in the layouts directory
    /// </summary>
    private List<string> GetModifiedLayoutFiles()
    {
        var result = ExecuteGitCommand($"diff --name-only --diff-filter=M -- \"{_layoutsPathRelativeToRepo}\"/*.json");

        if (result.ExitCode != 0)
        {
            return new List<string>();
        }

        return result
            .StandardOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Select(f => f.Trim())
            .Where(f => !string.IsNullOrWhiteSpace(f))
            .ToList();
    }

    /// <summary>
    /// Generate unified diff for a specific file
    /// </summary>
    private string GenerateUnifiedDiff(string filePath)
    {
        var result = ExecuteGitCommand($"diff --no-ext-diff --unified=3 -- {filePath}");

        if (result.ExitCode != 0)
        {
            throw new InvalidOperationException($"Failed to generate diff for {filePath}: {result.StandardError}");
        }

        return result.StandardOutput;
    }

    /// <summary>
    /// Execute git command and capture output
    /// </summary>
    private ProcessResult ExecuteGitCommand(string arguments)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "git",
            Arguments = arguments,
            WorkingDirectory = _repositoryRoot,
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
