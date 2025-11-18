using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.DataProcessingRules;

/// <summary>
/// Updates Program.cs to register IDataWriteProcessor implementations
/// </summary>
internal class ProgramCsUpdater
{
    private readonly string _appBasePath;

    public ProgramCsUpdater(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Register a data processor in Program.cs
    /// </summary>
    /// <param name="className">The class name (e.g., "ChangenameDataProcessor")</param>
    /// <returns>True if registration was added or already exists, false if Program.cs not found</returns>
    public bool RegisterDataProcessor(string className)
    {
        // Try with App folder first, then without
        var programCsPath = Path.Combine(_appBasePath, "App", "Program.cs");
        if (!File.Exists(programCsPath))
        {
            programCsPath = Path.Combine(_appBasePath, "Program.cs");
        }

        if (!File.Exists(programCsPath))
        {
            Console.WriteLine($"Warning: Program.cs not found at {programCsPath}");
            return false;
        }

        var content = File.ReadAllText(programCsPath);

        // Ensure the using statement for Altinn.App.Logic is present (exact match, not a sub-namespace)
        var usingLogicPattern = @"^\s*using\s+Altinn\.App\.Logic\s*;";
        var needsUsingStatement = !Regex.IsMatch(content, usingLogicPattern, RegexOptions.Multiline);

        // Check if already registered
        var registrationLine = $"services.AddTransient<IDataWriteProcessor, {className}>();";
        if (content.Contains(registrationLine))
        {
            // Even if registered, add the using statement if it's missing
            if (needsUsingStatement)
            {
                var firstUsingPattern = @"^using\s+.*;";
                var firstUsingMatch = Regex.Match(content, firstUsingPattern, RegexOptions.Multiline);

                if (firstUsingMatch.Success)
                {
                    var insertPosition = firstUsingMatch.Index + firstUsingMatch.Length;
                    content = content.Insert(insertPosition, "\nusing Altinn.App.Logic;");
                    File.WriteAllText(programCsPath, content);
                    Console.WriteLine($"  Added using Altinn.App.Logic; to Program.cs");
                }
            }

            Console.WriteLine($"  {className} is already registered in Program.cs");
            return true;
        }

        // Find the best place to add the registration
        // Look for existing IDataWriteProcessor registrations
        var dataProcessorPattern = @"services\.AddTransient<IDataWriteProcessor,\s*\w+>\(\);";
        var match = Regex.Match(content, dataProcessorPattern);

        string updatedContent;

        if (match.Success)
        {
            // Add after existing IDataWriteProcessor registration
            var insertPosition = match.Index + match.Length;
            updatedContent = content.Insert(
                insertPosition,
                $"\nservices.AddTransient<IDataWriteProcessor, {className}>();"
            );
        }
        else
        {
            // Look for the services registration section
            // Try to find "void RegisterCustomAppServices" or similar
            var customServicesPattern = @"void\s+RegisterCustomAppServices\s*\([^)]*\)\s*\{";
            var customServicesMatch = Regex.Match(content, customServicesPattern);

            if (customServicesMatch.Success)
            {
                // Insert at the beginning of RegisterCustomAppServices
                var insertPosition = customServicesMatch.Index + customServicesMatch.Length;
                updatedContent = content.Insert(
                    insertPosition,
                    $"\n    services.AddTransient<IDataWriteProcessor, {className}>();"
                );
            }
            else
            {
                // Last resort: try to find where services are being configured
                var servicesPattern = @"services\.Add";
                var servicesMatch = Regex.Match(content, servicesPattern);

                if (servicesMatch.Success)
                {
                    // Add before the first services.Add line
                    var insertPosition = servicesMatch.Index;
                    updatedContent = content.Insert(
                        insertPosition,
                        $"services.AddTransient<IDataWriteProcessor, {className}>();\n"
                    );
                }
                else
                {
                    Console.WriteLine(
                        $"Warning: Could not find appropriate place to register {className} in Program.cs"
                    );
                    Console.WriteLine($"Please manually add: {registrationLine}");
                    return false;
                }
            }
        }

        // Add the using statement if needed (was checked earlier)
        if (needsUsingStatement)
        {
            var firstUsingPattern = @"^using\s+.*;";
            var firstUsingMatch = Regex.Match(updatedContent, firstUsingPattern, RegexOptions.Multiline);

            if (firstUsingMatch.Success)
            {
                var insertPosition = firstUsingMatch.Index + firstUsingMatch.Length;
                updatedContent = updatedContent.Insert(insertPosition, "\nusing Altinn.App.Logic;");
            }
        }

        // Write back the updated content
        File.WriteAllText(programCsPath, updatedContent);
        Console.WriteLine($"  Registered {className} in Program.cs");

        return true;
    }

    /// <summary>
    /// Check if a data processor is already registered in Program.cs
    /// </summary>
    public bool IsDataProcessorRegistered(string className)
    {
        var programCsPath = Path.Combine(_appBasePath, "Program.cs");

        if (!File.Exists(programCsPath))
        {
            return false;
        }

        var content = File.ReadAllText(programCsPath);
        var registrationLine = $"services.AddTransient<IDataWriteProcessor, {className}>();";

        return content.Contains(registrationLine);
    }

    /// <summary>
    /// Remove a data processor registration from Program.cs
    /// </summary>
    public bool UnregisterDataProcessor(string className)
    {
        var programCsPath = Path.Combine(_appBasePath, "Program.cs");

        if (!File.Exists(programCsPath))
        {
            return false;
        }

        var content = File.ReadAllText(programCsPath);
        var registrationPattern = $@"\s*services\.AddTransient<IDataWriteProcessor,\s*{Regex.Escape(className)}>\(\);";

        var updatedContent = Regex.Replace(content, registrationPattern, "");

        if (updatedContent != content)
        {
            File.WriteAllText(programCsPath, updatedContent);
            Console.WriteLine($"  Unregistered {className} from Program.cs");
            return true;
        }

        return false;
    }
}
