namespace Altinn.Augmenter.Agent.Services.Agent.Orchestration;

public sealed class MarkdownRulesLoader : IRulesLoader
{
    public async Task<IReadOnlyList<RuleEntry>> LoadAsync(string folderAbsolutePath, CancellationToken ct = default)
    {
        if (!Directory.Exists(folderAbsolutePath))
            throw new DirectoryNotFoundException($"Rules folder not found: {folderAbsolutePath}");

        var files = Directory.GetFiles(folderAbsolutePath, "*.md", SearchOption.TopDirectoryOnly)
            .OrderBy(p => p, StringComparer.Ordinal)
            .ToList();

        var entries = new List<RuleEntry>(files.Count);
        foreach (var path in files)
        {
            var markdown = await File.ReadAllTextAsync(path, ct);
            entries.Add(new RuleEntry
            {
                PunktKey = Path.GetFileNameWithoutExtension(path),
                Markdown = markdown,
            });
        }
        return entries;
    }
}
