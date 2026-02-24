namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.ConditionalRenderingRules;

/// <summary>
/// Main orchestrator for restoring whitespace-only changes
/// </summary>
internal sealed class WhitespaceRestorationProcessor
{
    private readonly string _repositoryRoot;
    private readonly string _layoutsPathRelativeToRepo;
    private readonly IGitRepositoryService _gitService;
    private readonly DirectFileRestorer _fileRestorer;

    public WhitespaceRestorationProcessor(string layoutsPath)
        : this(layoutsPath, new LibGit2SharpGitRepositoryService()) { }

    // Constructor for dependency injection (testability)
    internal WhitespaceRestorationProcessor(string layoutsPath, IGitRepositoryService gitService)
    {
        _gitService = gitService;
        _fileRestorer = new DirectFileRestorer(gitService);
        _repositoryRoot = _gitService.FindRepositoryRoot(layoutsPath);

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
            // Get modified layout files using LibGit2Sharp
            var modifiedFiles = _gitService.GetModifiedFiles(_repositoryRoot, _layoutsPathRelativeToRepo).ToList();
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
                    var diffOutput = _gitService.GetUnifiedDiff(_repositoryRoot, filePath);
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

            // Restore whitespace-only changes by directly manipulating files
            if (result.WhitespaceOnlyHunksFound > 0)
            {
                try
                {
                    foreach (var diffFile in allDiffFiles)
                    {
                        var whitespaceOnlyHunks = diffFile
                            .Hunks.Where(h =>
                                allClassifications.ContainsKey(h) && allClassifications[h].IsWhitespaceOnly
                            )
                            .ToList();

                        if (whitespaceOnlyHunks.Count > 0)
                        {
                            _fileRestorer.RestoreWhitespaceOnlyChanges(diffFile, allClassifications, _repositoryRoot);
                            result.HunksReverted += whitespaceOnlyHunks.Count;
                        }
                    }
                }
                catch (Exception ex)
                {
                    result.Success = false;
                    result.Errors.Add($"Failed to restore whitespace changes: {ex.Message}");
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
}
