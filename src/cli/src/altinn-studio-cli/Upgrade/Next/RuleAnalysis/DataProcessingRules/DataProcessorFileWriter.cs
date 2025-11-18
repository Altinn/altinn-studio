namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.DataProcessingRules;

/// <summary>
/// Writes generated IDataWriteProcessor files to disk
/// </summary>
internal class DataProcessorFileWriter
{
    private readonly string _appBasePath;

    public DataProcessorFileWriter(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Write a generated data processor class to the logic folder
    /// </summary>
    /// <param name="className">The class name (e.g., "ChangenameDataProcessor")</param>
    /// <param name="code">The generated C# code</param>
    /// <returns>The full path to the written file</returns>
    public string WriteDataProcessor(string className, string code)
    {
        // Try with App folder first, then without
        var logicDir = Path.Combine(_appBasePath, "App", "logic");
        if (!Directory.Exists(Path.Combine(_appBasePath, "App")))
        {
            logicDir = Path.Combine(_appBasePath, "logic");
        }

        // Create logic directory if it doesn't exist
        if (!Directory.Exists(logicDir))
        {
            Directory.CreateDirectory(logicDir);
        }

        var fileName = $"{className}.cs";
        var filePath = Path.Combine(logicDir, fileName);

        // Write the file
        File.WriteAllText(filePath, code);

        return filePath;
    }

    /// <summary>
    /// Check if a data processor file already exists
    /// </summary>
    public bool DataProcessorExists(string className)
    {
        var logicDir = Path.Combine(_appBasePath, "logic");
        var fileName = $"{className}.cs";
        var filePath = Path.Combine(logicDir, fileName);

        return File.Exists(filePath);
    }

    /// <summary>
    /// Delete a data processor file
    /// </summary>
    public bool DeleteDataProcessor(string className)
    {
        var logicDir = Path.Combine(_appBasePath, "logic");
        var fileName = $"{className}.cs";
        var filePath = Path.Combine(logicDir, fileName);

        if (File.Exists(filePath))
        {
            File.Delete(filePath);
            return true;
        }

        return false;
    }
}
