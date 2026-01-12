namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Main class for Index.cshtml analysis and migration
/// </summary>
internal sealed class IndexCshtmlMigrator
{
    private readonly string _projectFolder;
    private readonly string _indexCshtmlPath;
    private readonly string _configOutputPath;

    public IndexCshtmlMigrator(string projectFolder)
    {
        _projectFolder = projectFolder;
        _indexCshtmlPath = Path.Combine(projectFolder, "App", "views", "Home", "Index.cshtml");
        _configOutputPath = Path.Combine(projectFolder, "App", "config", "frontend.json");
    }

    /// <summary>
    /// Analyzes or migrates Index.cshtml
    /// </summary>
    /// <param name="analyzeOnly">If true, only analyze and report; if false, perform full migration</param>
    /// <returns>0 on success, 1 on failure</returns>
    public async Task<int> Analyze(bool analyzeOnly)
    {
        try
        {
            // Check if Index.cshtml exists
            if (!File.Exists(_indexCshtmlPath))
            {
                Console.WriteLine("Index.cshtml not found - already migrated or using different structure");
                return 0;
            }

            // Parse Index.cshtml
            var parser = new IndexFileParser(_indexCshtmlPath);
            await parser.Parse();

            var document = parser.GetDocument();
            if (document == null)
            {
                Console.WriteLine("Failed to parse Index.cshtml - document is null");
                return 1;
            }

            // Run detectors
            var cssDetector = new CustomCssDetector(document);
            var jsDetector = new CustomJavaScriptDetector(document);
            var frontendDetector = new CustomFrontendDetector(document);

            var cssResult = cssDetector.Detect();
            var jsResult = jsDetector.Detect();
            var frontendResult = frontendDetector.Detect();

            var analysisResult = IndexAnalysisResult.Successful(
                _indexCshtmlPath,
                cssResult,
                jsResult,
                frontendResult,
                parser.GetParseWarnings()
            );

            // If analyze-only mode, print report and exit
            if (analyzeOnly)
            {
                return PrintAnalysisReport(analysisResult);
            }

            // Full migration mode
            return await PerformMigration(analysisResult);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error during Index.cshtml migration: {ex.Message}");
            return 1;
        }
    }

    private int PrintAnalysisReport(IndexAnalysisResult result)
    {
        if (result.CustomCss.InlineStyles.Count > 0)
        {
            Console.WriteLine($"Found {result.CustomCss.InlineStyles.Count} inline CSS block(s)");
        }

        if (result.CustomCss.ExternalStylesheets.Count > 0)
        {
            Console.WriteLine($"Found {result.CustomCss.ExternalStylesheets.Count} external stylesheet(s):");
            foreach (var stylesheet in result.CustomCss.ExternalStylesheets)
            {
                Console.WriteLine($"  - {stylesheet}");
            }
        }

        if (result.CustomJavaScript.InlineScripts.Count > 0)
        {
            Console.WriteLine($"Found {result.CustomJavaScript.InlineScripts.Count} inline JavaScript block(s)");
        }

        if (result.CustomJavaScript.ExternalScripts.Count > 0)
        {
            Console.WriteLine($"Found {result.CustomJavaScript.ExternalScripts.Count} external script(s):");
            foreach (var script in result.CustomJavaScript.ExternalScripts)
            {
                Console.WriteLine($"  - {script}");
            }
        }

        if (result.CustomFrontend.IsCustomFrontend)
        {
            Console.WriteLine("Custom frontend: Yes (standard Altinn app-frontend not detected)");
        }

        if (result.Warnings.Count > 0)
        {
            Console.WriteLine();
            Console.WriteLine("Warnings:");
            foreach (var warning in result.Warnings)
            {
                Console.WriteLine($"  - {warning}");
            }
        }

        return 0;
    }

    private async Task<int> PerformMigration(IndexAnalysisResult result)
    {
        Console.WriteLine("Migrating Index.cshtml to frontend.json configuration...");

        var createdFiles = new List<string>();

        try
        {
            // Extract inline content to files
            if (result.CustomCss.InlineStyles.Count > 0 || result.CustomJavaScript.InlineScripts.Count > 0)
            {
                var extractor = new InlineContentExtractor(_projectFolder, result);
                var (cssFiles, jsFiles) = await extractor.Extract();

                createdFiles.AddRange(cssFiles);
                createdFiles.AddRange(jsFiles);

                if (cssFiles.Count > 0)
                {
                    Console.WriteLine($"Extracted {cssFiles.Count} inline CSS block(s) to /App/wwwroot/custom-css/");
                }

                if (jsFiles.Count > 0)
                {
                    Console.WriteLine($"Extracted {jsFiles.Count} inline JS block(s) to /App/wwwroot/custom-js/");
                }
            }

            // Generate and write frontend.json configuration (only if there are external URLs)
            var configGenerator = new FrontendConfigGenerator(result);
            var config = configGenerator.Generate();

            if (config.HasContent)
            {
                await configGenerator.WriteToFile(_configOutputPath);
                var urlCount = config.Stylesheets.Count + config.Scripts.Count;
                Console.WriteLine($"Generated frontend.json with {urlCount} external URL(s)");
            }

            // Delete Index.cshtml
            if (File.Exists(_indexCshtmlPath))
            {
                // Validate file name before deletion for safety
                var fileName = Path.GetFileName(_indexCshtmlPath);
                if (fileName != "Index.cshtml")
                {
                    Console.WriteLine($"Warning: Refusing to delete file with unexpected name: {fileName}");
                    return 1;
                }

                File.Delete(_indexCshtmlPath);
                Console.WriteLine("Deleted Index.cshtml");
            }

            // Clean up empty directories
            CleanupEmptyDirectories();

            Console.WriteLine("Migration complete");
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Migration failed: {ex.Message}");

            // Attempt rollback of created files
            Console.WriteLine("Attempting to rollback created files...");
            foreach (var file in createdFiles)
            {
                try
                {
                    if (File.Exists(file))
                    {
                        File.Delete(file);
                    }
                }
                catch
                {
                    // Ignore errors during rollback
                }
            }

            // Attempt to delete config file if created
            try
            {
                if (File.Exists(_configOutputPath))
                {
                    File.Delete(_configOutputPath);
                }
            }
            catch
            {
                // Ignore errors during rollback
            }

            return 1;
        }
    }

    private void CleanupEmptyDirectories()
    {
        try
        {
            var homeDir = Path.Combine(_projectFolder, "App", "views", "Home");
            if (Directory.Exists(homeDir) && !Directory.EnumerateFileSystemEntries(homeDir).Any())
            {
                Directory.Delete(homeDir);
                Console.WriteLine("Cleaned up empty directory: views/Home/");
            }

            var viewsDir = Path.Combine(_projectFolder, "App", "views");
            if (Directory.Exists(viewsDir) && !Directory.EnumerateFileSystemEntries(viewsDir).Any())
            {
                Directory.Delete(viewsDir);
                Console.WriteLine("Cleaned up empty directory: views/");
            }
        }
        catch (Exception ex)
        {
            // Log warning but don't fail migration
            Console.WriteLine($"Warning: Failed to clean up empty directories: {ex.Message}");
        }
    }
}
