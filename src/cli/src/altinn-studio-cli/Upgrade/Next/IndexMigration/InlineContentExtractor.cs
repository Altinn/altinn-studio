namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Extracts inline CSS and JavaScript content to files
/// </summary>
internal sealed class InlineContentExtractor
{
    private readonly string _projectFolder;
    private readonly IndexAnalysisResult _analysisResult;

    public InlineContentExtractor(string projectFolder, IndexAnalysisResult analysisResult)
    {
        _projectFolder = projectFolder;
        _analysisResult = analysisResult;
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

        if (_analysisResult.CustomCss.InlineStyles.Count == 0)
        {
            return createdFiles;
        }

        var cssDir = Path.Combine(_projectFolder, "App", "wwwroot", "custom-css");
        Directory.CreateDirectory(cssDir);

        for (int i = 0; i < _analysisResult.CustomCss.InlineStyles.Count; i++)
        {
            var content = _analysisResult.CustomCss.InlineStyles[i];
            var fileName = i == 0 ? "styles.css" : $"styles-{i}.css";
            var filePath = Path.Combine(cssDir, fileName);

            await File.WriteAllTextAsync(filePath, content);
            createdFiles.Add(filePath);
        }

        return createdFiles;
    }

    private async Task<List<string>> ExtractInlineJs()
    {
        var createdFiles = new List<string>();

        if (_analysisResult.CustomJavaScript.InlineScripts.Count == 0)
        {
            return createdFiles;
        }

        var jsDir = Path.Combine(_projectFolder, "App", "wwwroot", "custom-js");
        Directory.CreateDirectory(jsDir);

        for (int i = 0; i < _analysisResult.CustomJavaScript.InlineScripts.Count; i++)
        {
            var content = _analysisResult.CustomJavaScript.InlineScripts[i];
            var fileName = i == 0 ? "script.js" : $"script-{i}.js";
            var filePath = Path.Combine(jsDir, fileName);

            await File.WriteAllTextAsync(filePath, content);
            createdFiles.Add(filePath);
        }

        return createdFiles;
    }
}
