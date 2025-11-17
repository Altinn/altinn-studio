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

        var command = new Command(
            "rule-convert",
            "Convert rules from RuleConfiguration.json and RuleHandler.js to expression language"
        )
        {
            projectFolderOption,
            uiFolderOption,
        };

        command.SetHandler(context =>
        {
            var projectFolder = context.ParseResult.GetValueForOption(projectFolderOption);
            var uiFolder = context.ParseResult.GetValueForOption(uiFolderOption);

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

            AnalyzeRules(uiFolderPath);
            Environment.Exit(0);
        });

        return command;
    }

    /// <summary>
    /// Analyze rules in all layout sets
    /// </summary>
    private static void AnalyzeRules(string uiFolderPath)
    {
        Console.WriteLine("Analyzing RuleConfiguration.json and RuleHandler.js files...\n");

        var layoutSets = Directory.GetDirectories(uiFolderPath);
        var hasAnyRules = false;

        foreach (var layoutSetPath in layoutSets)
        {
            var layoutSetName = Path.GetFileName(layoutSetPath);
            var ruleConfigPath = Path.Combine(layoutSetPath, "RuleConfiguration.json");
            var ruleHandlerPath = Path.Combine(layoutSetPath, "RuleHandler.js");

            // Skip if no RuleConfiguration.json exists
            if (!File.Exists(ruleConfigPath))
            {
                continue;
            }

            hasAnyRules = true;

            try
            {
                // Parse RuleConfiguration.json
                var configParser = new RuleConfigurationParser(ruleConfigPath);
                configParser.Parse();

                var conditionalRules = configParser.GetConditionalRenderingRules();
                var dataProcessingRules = configParser.GetDataProcessingRules();

                // Parse RuleHandler.js
                var jsParser = new RuleHandlerParser(ruleHandlerPath);
                jsParser.Parse();

                // Generate report
                var reporter = new RuleAnalysisReporter(layoutSetName, conditionalRules, dataProcessingRules, jsParser);
                reporter.GenerateReport();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"\nError analyzing layout set '{layoutSetName}': {ex.Message}");
            }
        }

        if (!hasAnyRules)
        {
            Console.WriteLine("No RuleConfiguration.json files found in any layout sets.");
        }
        else
        {
            Console.WriteLine("\nAnalysis complete.");
        }
    }
}
