using System.CommandLine;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis;

/// <summary>
/// Command for converting rules from RuleConfiguration.json and RuleHandler.js to expression language
/// </summary>
internal static class RuleConvertCommand
{
    /// <summary>
    /// Get the rule convert command
    /// </summary>
    /// <param name="projectFolderOption">Option for setting the root folder of the project</param>
    /// <returns>The command for converting rules</returns>
    public static Command GetCommand(Option<string> projectFolderOption)
    {
        var uiFolderOption = new Option<string>(
            name: "--ui-folder",
            description: "The UI folder containing layout sets",
            getDefaultValue: () => "App/ui/"
        );

        var failuresOnlyOption = new Option<bool>(
            name: "--failures-only",
            description: "Only show rules that failed to convert",
            getDefaultValue: () => false
        );

        var foldersOption = new Option<string?>(
            name: "--folders",
            description: "Path to a parent folder containing multiple apps to analyze"
        );

        var command = new Command(
            "rule-convert",
            "Convert rules from RuleConfiguration.json and RuleHandler.js to expression language"
        )
        {
            projectFolderOption,
            uiFolderOption,
            failuresOnlyOption,
            foldersOption,
        };

        command.SetHandler(context =>
        {
            var projectFolder = context.ParseResult.GetValueForOption(projectFolderOption);
            var uiFolder = context.ParseResult.GetValueForOption(uiFolderOption);
            var failuresOnly = context.ParseResult.GetValueForOption(failuresOnlyOption);
            var foldersPath = context.ParseResult.GetValueForOption(foldersOption);

            // Check if --folders mode is enabled
            if (!string.IsNullOrEmpty(foldersPath))
            {
                if (!Path.IsPathRooted(foldersPath))
                {
                    foldersPath = Path.Combine(Directory.GetCurrentDirectory(), foldersPath);
                }

                if (!Directory.Exists(foldersPath))
                {
                    Console.Error.WriteLine($"Folders path not found: {foldersPath}");
                    Environment.Exit(1);
                    return;
                }

                if (uiFolder is null)
                {
                    Console.Error.WriteLine("UI folder option is required");
                    Environment.Exit(1);
                    return;
                }

                AnalyzeMultipleApps(foldersPath, uiFolder, failuresOnly);
                Environment.Exit(0);
                return;
            }

            // Single app mode (existing behavior)
            if (projectFolder is null or "CurrentDirectory")
            {
                projectFolder = Directory.GetCurrentDirectory();
            }

            if (!Path.IsPathRooted(projectFolder))
            {
                projectFolder = Path.Combine(Directory.GetCurrentDirectory(), projectFolder);
            }

            if (uiFolder is null)
            {
                Console.Error.WriteLine("UI folder option is required");
                Environment.Exit(1);
                return;
            }

            var uiFolderPath = Path.Combine(projectFolder, uiFolder);

            if (!Directory.Exists(uiFolderPath))
            {
                Console.Error.WriteLine($"UI folder not found: {uiFolderPath}");
                Environment.Exit(1);
                return;
            }

            AnalyzeRules(uiFolderPath, failuresOnly);
            Environment.Exit(0);
        });

        return command;
    }

    /// <summary>
    /// Analyze rules in all layout sets
    /// </summary>
    /// <returns>Statistics from the analysis</returns>
    private static RuleAnalysisStats AnalyzeRules(string uiFolderPath, bool failuresOnly)
    {
        var layoutSets = Directory.GetDirectories(uiFolderPath);
        var totalStats = new RuleAnalysisStats();

        foreach (var layoutSetPath in layoutSets)
        {
            var layoutSetName = Path.GetFileName(layoutSetPath);
            var ruleConfigPath = Path.Combine(layoutSetPath, "RuleConfiguration.json");
            var ruleHandlerPath = Path.Combine(layoutSetPath, "RuleHandler.js");

            if (!File.Exists(ruleConfigPath))
            {
                Console.WriteLine($"Layout set '{layoutSetName}' does not contain a RuleConfiguration.json file");
                continue;
            }

            var fileContent = File.ReadAllText(ruleConfigPath).Trim();
            if (string.IsNullOrEmpty(fileContent) || fileContent == "{}" || fileContent == "[]")
            {
                Console.WriteLine($"Layout set '{layoutSetName}' does not contain any rules");
                continue;
            }

            try
            {
                var configParser = new RuleConfigurationParser(ruleConfigPath);
                configParser.Parse();

                var conditionalRules = configParser.GetConditionalRenderingRules();
                var dataProcessingRules = configParser.GetDataProcessingRules();

                if (conditionalRules.Count == 0 && dataProcessingRules.Count == 0)
                {
                    continue;
                }

                Console.WriteLine($"Analyzing layout set '{layoutSetName}'");
                Console.WriteLine(
                    $"Found {conditionalRules.Count} conditional rendering rules and {dataProcessingRules.Count} data processing rules"
                );

                var jsParser = new RuleHandlerParser(ruleHandlerPath);
                jsParser.Parse();

                var reporter = new RuleAnalysisReporter(layoutSetName, conditionalRules, dataProcessingRules, jsParser);
                var stats = reporter.GenerateReport(failuresOnly);

                // Accumulate statistics
                totalStats.TotalConditionalRules += stats.TotalConditionalRules;
                totalStats.SuccessfulConversions += stats.SuccessfulConversions;
                totalStats.FailedConversions += stats.FailedConversions;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"\nError analyzing layout set '{layoutSetName}': {ex.Message}");
            }
        }

        return totalStats;
    }

    /// <summary>
    /// Analyze multiple apps in a parent folder
    /// </summary>
    private static void AnalyzeMultipleApps(string parentFolderPath, string uiFolder, bool failuresOnly)
    {
        var appFolders = Directory.GetDirectories(parentFolderPath);
        var totalApps = 0;
        var appsWithConditionalRendering = 0;
        var successsfulApps = 0;
        var overallStats = new RuleAnalysisStats();

        foreach (var appFolder in appFolders)
        {
            var appName = Path.GetFileName(appFolder);
            var uiFolderPath = Path.Combine(appFolder, uiFolder);
            if (!Directory.Exists(uiFolderPath))
            {
                continue;
            }

            totalApps++;
            Console.WriteLine($"Analyzing app: {appName}");

            var appStats = AnalyzeRules(uiFolderPath, failuresOnly);
            if (appStats.TotalConditionalRules > 0)
            {
                appsWithConditionalRendering++;
            }

            // Accumulate overall statistics
            overallStats.TotalConditionalRules += appStats.TotalConditionalRules;
            overallStats.SuccessfulConversions += appStats.SuccessfulConversions;
            overallStats.FailedConversions += appStats.FailedConversions;
            successsfulApps +=
                appStats.SuccessfulConversions == appStats.TotalConditionalRules && appStats.TotalConditionalRules > 0
                    ? 1
                    : 0;
        }

        // Print summary report
        Console.WriteLine($"\n\n{new string('=', 80)}");
        Console.WriteLine("SUMMARY REPORT");
        Console.WriteLine(new string('=', 80));
        Console.WriteLine($"Total apps analyzed: {totalApps} apps");
        Console.WriteLine($"Apps with conditional rendering rules: {appsWithConditionalRendering} apps");
        Console.WriteLine($"Apps that could be fully converted: {successsfulApps} of {appsWithConditionalRendering} apps");
        Console.WriteLine($"");
        Console.WriteLine($"Total conditional rendering rules: {overallStats.TotalConditionalRules} rules");
        Console.WriteLine($"Successfully converted to expressions: {overallStats.SuccessfulConversions} rules");
        Console.WriteLine($"Failed to convert: {overallStats.FailedConversions} rules");

        var successPercentage = (double)overallStats.SuccessfulConversions / overallStats.TotalConditionalRules * 100;
        Console.WriteLine($"\nConversion success rate: {successPercentage:F1}%");

        var successfulAppsPercentage = (double)successsfulApps / appsWithConditionalRendering * 100;
        Console.WriteLine($"Conversion success rate for fully converted apps: {successfulAppsPercentage:F1}%");

        Console.WriteLine(new string('=', 80));
    }
}
