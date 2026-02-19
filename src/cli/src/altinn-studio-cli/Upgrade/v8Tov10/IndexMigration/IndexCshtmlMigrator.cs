using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.IndexMigration;

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
        _configOutputPath = Path.Combine(projectFolder, "App", "config", "assets.json");
    }

    /// <summary>
    /// Migrates Index.cshtml to assets.json configuration
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

        // Check for Razor directives FIRST - these block migration
        if (parser.HasRazorDirectives)
        {
            Console.WriteLine("Keeping Index.cshtml due to Razor directives:");
            foreach (var directive in parser.DetectedRazorDirectives)
            {
                Console.WriteLine($"  - {directive}");
            }
            Console.WriteLine(
                "(Razor directives like @if/@else, @Html., @{ } cannot be migrated to a static config file)"
            );
            return 1;
        }

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

        var frameworkValidationError = ValidateFrameworkFileConsistency(categorizationResult);
        if (frameworkValidationError != null)
        {
            Console.WriteLine($"Keeping Index.cshtml: {frameworkValidationError}");
            return 1;
        }

        return await PerformMigration(categorizationResult);
    }

    /// <summary>
    /// Validates that framework CSS and JS are both present or both absent.
    /// A mismatch indicates a partial/broken template that shouldn't be migrated.
    /// </summary>
    private static string? ValidateFrameworkFileConsistency(CategorizationResult result)
    {
        var hasFrameworkJs = result.ExpectedElements.Any(e =>
            e.Description.Contains("Altinn app frontend JS", StringComparison.OrdinalIgnoreCase)
        );
        var hasFrameworkCss = result.ExpectedElements.Any(e =>
            e.Description.Contains("Altinn app frontend CSS", StringComparison.OrdinalIgnoreCase)
        );

        if (hasFrameworkJs && !hasFrameworkCss)
        {
            return "Framework JS (altinn-app-frontend.js) found but framework CSS (altinn-app-frontend.css) is missing - partial template detected";
        }

        if (hasFrameworkCss && !hasFrameworkJs)
        {
            return "Framework CSS (altinn-app-frontend.css) found but framework JS (altinn-app-frontend.js) is missing - partial template detected";
        }

        return null; // Valid: either both present or both absent
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

            var orgApp = await ReadOrgAndAppFromMetadata();

            var configGenerator = new AssetsConfigGenerator(categorizationResult, orgApp?.Org, orgApp?.App);
            var config = configGenerator.Generate();

            if (config.HasContent)
            {
                await configGenerator.WriteToFile(_configOutputPath);
                var urlCount = config.Stylesheets.Count + config.Scripts.Count;
                Console.WriteLine($"Generated assets.json with {urlCount} external URL(s)");
            }

            if (File.Exists(_indexCshtmlPath))
            {
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

            foreach (var file in createdFiles)
            {
                if (File.Exists(file))
                {
                    File.Delete(file);
                }
            }

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

    /// <summary>
    /// Reads org and app values from applicationmetadata.json
    /// </summary>
    /// <returns>Tuple of (org, app) or null if not found</returns>
    private async Task<(string Org, string App)?> ReadOrgAndAppFromMetadata()
    {
        var metadataPath = Path.Combine(_projectFolder, "App", "config", "applicationmetadata.json");
        if (!File.Exists(metadataPath))
        {
            return null;
        }

        var json = await File.ReadAllTextAsync(metadataPath);
        using var doc = JsonDocument.Parse(json);

        if (doc.RootElement.TryGetProperty("id", out var idElement))
        {
            var id = idElement.GetString();
            if (!string.IsNullOrEmpty(id))
            {
                var parts = id.Split('/', 2);
                if (parts.Length == 2)
                {
                    return (parts[0], parts[1]);
                }
            }
        }

        return null;
    }
}
