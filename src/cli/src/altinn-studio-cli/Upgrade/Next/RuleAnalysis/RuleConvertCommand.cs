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

        var command = new Command(
            "rule-convert",
            "Convert rules from RuleConfiguration.json and RuleHandler.js to expression language"
        )
        {
            projectFolderOption,
            uiFolderOption,
            failuresOnlyOption,
        };

        command.SetHandler(context =>
        {
            var projectFolder = context.ParseResult.GetValueForOption(projectFolderOption);
            var uiFolder = context.ParseResult.GetValueForOption(uiFolderOption);
            var failuresOnly = context.ParseResult.GetValueForOption(failuresOnlyOption);

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
    private static void AnalyzeRules(string uiFolderPath, bool failuresOnly)
    {
        var layoutSets = Directory.GetDirectories(uiFolderPath);

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
                reporter.GenerateReport(failuresOnly);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"\nError analyzing layout set '{layoutSetName}': {ex.Message}");
            }
        }
    }
}
