namespace Altinn.Studio.Cli.Upgrade.Next.IndexMigration;

/// <summary>
/// Main class for Index.cshtml migration
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
    /// Migrates Index.cshtml to frontend.json configuration
    /// </summary>
    /// <returns>0 on success, 1 on failure</returns>
    public async Task<int> Migrate()
    {
        if (!File.Exists(_indexCshtmlPath))
        {
            Console.WriteLine("Index.cshtml not found - nothing to migrate");
            return 0;
        }

        var parser = new IndexFileParser(_indexCshtmlPath);
        await parser.Parse();

        var document = parser.GetDocument();
        if (document == null)
        {
            Console.WriteLine("Failed to parse Index.cshtml, document is null");
            return 1;
        }

        var categorizer = new ElementCategorizer();
        var categorizationResult = categorizer.Categorize(document);

        if (!categorizationResult.IsSafeToMigrate)
        {
            Console.WriteLine(
                "Keeping Index.cshtml due to unexpected elements (please review it manually and delete it if you want the auto-generated one)"
            );
            return 1;
        }

        return await PerformMigration(categorizationResult);
    }

    private async Task<int> PerformMigration(CategorizationResult categorizationResult)
    {
        var createdFiles = new List<string>();

        var hasInlineContent = categorizationResult.KnownCustomizations.Any(c =>
            c.CustomizationType == CustomizationType.InlineStylesheet
            || c.CustomizationType == CustomizationType.InlineScript
        );

        try
        {
            if (hasInlineContent)
            {
                var extractor = new InlineContentExtractor(_projectFolder, categorizationResult);
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
            var configGenerator = new FrontendConfigGenerator(categorizationResult);
            var config = configGenerator.Generate();

            if (config.HasContent)
            {
                await configGenerator.WriteToFile(_configOutputPath);
                var urlCount = config.Stylesheets.Count + config.Scripts.Count;
                Console.WriteLine($"Generated frontend.json with {urlCount} external URL(s)");
            }

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

            CleanupEmptyDirectories();

            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Index.cshtml migration failed: {ex.Message}");

            // Attempt rollback of created files
            foreach (var file in createdFiles)
            {
                if (File.Exists(file))
                {
                    File.Delete(file);
                }
            }

            // Attempt to delete config file if created
            if (File.Exists(_configOutputPath))
            {
                File.Delete(_configOutputPath);
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
            }

            var viewsDir = Path.Combine(_projectFolder, "App", "views");
            if (Directory.Exists(viewsDir) && !Directory.EnumerateFileSystemEntries(viewsDir).Any())
            {
                Directory.Delete(viewsDir);
            }
        }
        catch (Exception ex)
        {
            // Log warning but don't fail migration
            Console.WriteLine($"Warning: Failed to clean up empty directories: {ex.Message}");
        }
    }
}
