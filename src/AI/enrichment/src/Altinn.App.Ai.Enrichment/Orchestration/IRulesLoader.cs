namespace Altinn.App.Ai.Enrichment.Orchestration;

/// <summary>Loads markdown rule files from the configured rules folder.</summary>
public interface IRulesLoader
{
    /// <summary>
    /// Returns all <c>*.md</c> files in the folder sorted by name. Each file's
    /// stem (filename without extension) becomes the punkt-key. The folder must exist.
    /// </summary>
    Task<IReadOnlyList<RuleEntry>> LoadAsync(string folderAbsolutePath, CancellationToken ct = default);
}
