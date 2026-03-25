using System.Text.RegularExpressions;

namespace Altinn.Augmenter.Agent.Services.Agent;

/// <summary>
/// Loads a skill.md file from a skill folder and resolves <c>@filename</c>
/// references by inlining the content of sibling files.
/// </summary>
public static partial class SkillLoader
{
    private const string SkillFileName = "skill.md";

    /// <summary>
    /// Loads the system prompt from skill.md in the given folder.
    /// Resolves <c>@filename.ext</c> references on their own line to the content
    /// of the referenced file in the same folder.
    /// </summary>
    public static async Task<string> LoadAsync(
        string skillFolder,
        CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(AppContext.BaseDirectory, skillFolder, SkillFileName);

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException(
                $"Skill file not found: {fullPath}. Ensure the skill folder contains a '{SkillFileName}' file.");
        }

        var baseDir = Path.GetDirectoryName(fullPath)!;
        var content = await File.ReadAllTextAsync(fullPath, cancellationToken);

        return await ResolveReferencesAsync(content, baseDir, cancellationToken);
    }

    private static async Task<string> ResolveReferencesAsync(
        string content,
        string baseDir,
        CancellationToken cancellationToken)
    {
        var matches = AtReferencePattern().Matches(content);

        if (matches.Count == 0)
            return content;

        // Process in reverse order so string indices remain valid
        var result = content;
        for (int i = matches.Count - 1; i >= 0; i--)
        {
            var match = matches[i];
            var filename = match.Groups["filename"].Value;
            var referencedPath = Path.Combine(baseDir, filename);

            if (!File.Exists(referencedPath))
            {
                throw new FileNotFoundException(
                    $"Referenced file not found: '{filename}' in skill folder '{baseDir}'.");
            }

            var referencedContent = await File.ReadAllTextAsync(referencedPath, cancellationToken);
            result = string.Concat(result.AsSpan(0, match.Index), referencedContent, result.AsSpan(match.Index + match.Length));
        }

        return result;
    }

    /// <summary>
    /// Matches lines that consist of only <c>@filename.ext</c> (with optional surrounding whitespace).
    /// </summary>
    [GeneratedRegex(@"^[ \t]*@(?<filename>[^\s@]+)[ \t]*$", RegexOptions.Multiline)]
    private static partial Regex AtReferencePattern();
}
