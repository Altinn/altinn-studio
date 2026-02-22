namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

/// <summary>
/// Extracts inline CSS and JavaScript content to files
/// </summary>
internal sealed class InlineContentExtractor
{
    private readonly string _projectFolder;
    private readonly List<string> _inlineStyles;
    private readonly List<string> _inlineScripts;

    public InlineContentExtractor(string projectFolder, CategorizationResult categorizationResult)
    {
        _projectFolder = projectFolder;
        _inlineStyles = categorizationResult
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.InlineStylesheet)
            .Select(c => c.ExtractionHint)
            .ToList();
        _inlineScripts = categorizationResult
            .KnownCustomizations.Where(c => c.CustomizationType == CustomizationType.InlineScript)
            .Select(c => c.ExtractionHint)
            .ToList();
    }

    /// <summary>
    /// Extracts all inline content to files
    /// </summary>
    /// <returns>Lists of created CSS and JS file paths</returns>
    public async Task<(List<string> cssFiles, List<string> jsFiles)> Extract()
    {
        var cssFiles = await ExtractInlineCss();
        var jsFiles = await ExtractInlineJs();
        return (cssFiles, jsFiles);
    }

    private async Task<List<string>> ExtractInlineCss()
    {
        var createdFiles = new List<string>();
        if (_inlineStyles.Count == 0)
        {
            return createdFiles;
        }

        var cssDir = Path.Combine(_projectFolder, "App", "wwwroot", "custom-css");
        Directory.CreateDirectory(cssDir);

        for (int i = 0; i < _inlineStyles.Count; i++)
        {
            var content = _inlineStyles[i];
            var fileName = _inlineStyles.Count == 1 ? "styles.css" : $"styles-{i}.css";
            var filePath = Path.Combine(cssDir, fileName);
            filePath = GetUniqueFilePath(filePath);

            await File.WriteAllTextAsync(filePath, content);
            createdFiles.Add(filePath);
        }

        return createdFiles;
    }

    private async Task<List<string>> ExtractInlineJs()
    {
        var createdFiles = new List<string>();
        if (_inlineScripts.Count == 0)
        {
            return createdFiles;
        }

        var jsDir = Path.Combine(_projectFolder, "App", "wwwroot", "custom-js");
        Directory.CreateDirectory(jsDir);

        for (int i = 0; i < _inlineScripts.Count; i++)
        {
            var content = _inlineScripts[i];
            var fileName = _inlineScripts.Count == 1 ? "script.js" : $"script-{i}.js";
            var filePath = Path.Combine(jsDir, fileName);
            filePath = GetUniqueFilePath(filePath);

            await File.WriteAllTextAsync(filePath, content);
            createdFiles.Add(filePath);
        }

        return createdFiles;
    }

    private static string GetUniqueFilePath(string filePath)
    {
        if (!File.Exists(filePath))
        {
            return filePath;
        }

        var directory = Path.GetDirectoryName(filePath) ?? string.Empty;
        var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(filePath);
        var extension = Path.GetExtension(filePath);

        int counter = 1;
        string uniquePath;
        do
        {
            uniquePath = Path.Combine(directory, $"{fileNameWithoutExtension}-{counter}{extension}");
            counter++;
        } while (File.Exists(uniquePath));

        return uniquePath;
    }
}
