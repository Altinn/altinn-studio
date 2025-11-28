using System.CommandLine;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleConfiguration;

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

        var generateProcessorsOption = new Option<bool>(
            name: "--generate-processors",
            description: "Generate C# IDataWriteProcessor classes for data processing rules. When used alone, only processes data processing rules.",
            getDefaultValue: () => false
        );

        var convertExpressionsOption = new Option<bool>(
            name: "--convert-expressions",
            description: "Convert conditional rendering rules to expressions. When used alone, only processes conditional rendering rules.",
            getDefaultValue: () => false
        );

        var verifyBuildOption = new Option<bool>(
            name: "--verify-build",
            description: "Verify that the app builds successfully after generating processors",
            getDefaultValue: () => false
        );

        var command = new Command(
            "rule-convert",
            "Convert rules from RuleConfiguration.json and RuleHandler.js to expression language or C# code"
        )
        {
            projectFolderOption,
            uiFolderOption,
            failuresOnlyOption,
            foldersOption,
            generateProcessorsOption,
            convertExpressionsOption,
            verifyBuildOption,
        };

        command.SetHandler(context =>
        {
            var projectFolder = context.ParseResult.GetValueForOption(projectFolderOption);
            var uiFolder = context.ParseResult.GetValueForOption(uiFolderOption);
            var failuresOnly = context.ParseResult.GetValueForOption(failuresOnlyOption);
            var foldersPath = context.ParseResult.GetValueForOption(foldersOption);
            var generateProcessors = context.ParseResult.GetValueForOption(generateProcessorsOption);
            var convertExpressions = context.ParseResult.GetValueForOption(convertExpressionsOption);
            var verifyBuild = context.ParseResult.GetValueForOption(verifyBuildOption);

            // Smart defaults: if neither flag is specified, analyze both (read-only mode)
            // If one or both flags are specified, only do what's requested
            var analyzeConditionalRendering = convertExpressions || (!generateProcessors && !convertExpressions);
            var analyzeDataProcessing = generateProcessors || (!generateProcessors && !convertExpressions);

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

                AnalyzeMultipleApps(
                    foldersPath,
                    uiFolder,
                    failuresOnly,
                    generateProcessors,
                    verifyBuild,
                    analyzeConditionalRendering,
                    analyzeDataProcessing
                );
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

            AnalyzeRules(
                projectFolder,
                uiFolderPath,
                failuresOnly,
                generateProcessors,
                verifyBuild,
                analyzeConditionalRendering,
                analyzeDataProcessing
            );
            Environment.Exit(0);
        });

        return command;
    }

    /// <summary>
    /// Analyze rules in all layout sets
    /// </summary>
    /// <returns>Statistics from the analysis</returns>
    private static RuleAnalysisStats AnalyzeRules(
        string appBasePath,
        string uiFolderPath,
        bool failuresOnly,
        bool generateProcessors,
        bool verifyBuild,
        bool analyzeConditionalRendering,
        bool analyzeDataProcessing
    )
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

                var jsParser = new RuleHandlerParser(ruleHandlerPath);
                jsParser.Parse();

                var reporter = new RuleAnalysisReporter(layoutSetName, conditionalRules, dataProcessingRules, jsParser);
                var stats = reporter.GenerateReport(failuresOnly, analyzeConditionalRendering, analyzeDataProcessing);

                // Accumulate statistics
                totalStats.TotalConditionalRules += stats.TotalConditionalRules;
                totalStats.SuccessfulConversions += stats.SuccessfulConversions;
                totalStats.FailedConversions += stats.FailedConversions;
                totalStats.TotalDataProcessingRules += stats.TotalDataProcessingRules;

                // Generate C# data processors if requested
                if (generateProcessors && dataProcessingRules.Count > 0)
                {
                    var processorStats = reporter.GenerateAndWriteDataProcessors(
                        appBasePath,
                        verifyBuild,
                        failuresOnly
                    );
                    totalStats.SuccessfulDataProcessingConversions +=
                        processorStats.SuccessfulDataProcessingConversions;
                    totalStats.FailedDataProcessingConversions += processorStats.FailedDataProcessingConversions;
                    totalStats.GeneratedProcessorFiles += processorStats.GeneratedProcessorFiles;

                    if (verifyBuild && processorStats.GeneratedProcessorFiles > 0)
                    {
                        totalStats.BuildSucceeded = processorStats.BuildSucceeded;
                    }
                }
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
    private static void AnalyzeMultipleApps(
        string parentFolderPath,
        string uiFolder,
        bool failuresOnly,
        bool generateProcessors,
        bool verifyBuild,
        bool analyzeConditionalRendering,
        bool analyzeDataProcessing
    )
    {
        var appFolders = Directory.GetDirectories(parentFolderPath);
        var totalApps = 0;
        var appsWithConditionalRendering = 0;
        var appsWithDataProcessing = 0;
        var successfulApps = 0;
        var buildsSucceeded = 0;
        var buildsFailed = 0;
        var overallStats = new RuleAnalysisStats();
        var lockObject = new object();

        // Use Parallel.ForEach to process apps in parallel (max 12 concurrent builds)
        var parallelOptions = new ParallelOptions { MaxDegreeOfParallelism = 12 };
        Parallel.ForEach(
            appFolders,
            parallelOptions,
            appFolder =>
            {
                var appName = Path.GetFileName(appFolder);
                var uiFolderPath = Path.Combine(appFolder, uiFolder);
                if (!Directory.Exists(uiFolderPath))
                {
                    return;
                }

                lock (lockObject)
                {
                    totalApps++;
                    Console.WriteLine($"Analyzing app: {appName}");
                }

                var appStats = AnalyzeRules(
                    appFolder,
                    uiFolderPath,
                    failuresOnly,
                    generateProcessors,
                    verifyBuild,
                    analyzeConditionalRendering,
                    analyzeDataProcessing
                );

                lock (lockObject)
                {
                    if (appStats.TotalConditionalRules > 0)
                    {
                        appsWithConditionalRendering++;
                    }

                    if (appStats.TotalDataProcessingRules > 0)
                    {
                        appsWithDataProcessing++;
                    }

                    // Accumulate overall statistics
                    overallStats.TotalConditionalRules += appStats.TotalConditionalRules;
                    overallStats.SuccessfulConversions += appStats.SuccessfulConversions;
                    overallStats.FailedConversions += appStats.FailedConversions;
                    overallStats.TotalDataProcessingRules += appStats.TotalDataProcessingRules;
                    overallStats.SuccessfulDataProcessingConversions += appStats.SuccessfulDataProcessingConversions;
                    overallStats.FailedDataProcessingConversions += appStats.FailedDataProcessingConversions;
                    overallStats.GeneratedProcessorFiles += appStats.GeneratedProcessorFiles;

                    successfulApps +=
                        appStats.SuccessfulConversions == appStats.TotalConditionalRules
                        && appStats.TotalConditionalRules > 0
                            ? 1
                            : 0;

                    if (verifyBuild && appStats.GeneratedProcessorFiles > 0)
                    {
                        if (appStats.BuildSucceeded)
                        {
                            buildsSucceeded++;
                        }
                        else
                        {
                            buildsFailed++;
                        }
                    }
                }
            }
        );

        // Print summary report
        Console.WriteLine($"\n\n{new string('=', 80)}");
        Console.WriteLine("SUMMARY REPORT");
        Console.WriteLine(new string('=', 80));
        Console.WriteLine($"Total apps analyzed: {totalApps} apps");

        if (analyzeConditionalRendering)
        {
            Console.WriteLine($"Apps with conditional rendering rules: {appsWithConditionalRendering} apps");
        }

        if (analyzeDataProcessing)
        {
            Console.WriteLine($"Apps with data processing rules: {appsWithDataProcessing} apps");
        }

        if (analyzeConditionalRendering)
        {
            Console.WriteLine(
                $"Apps that could be fully converted: {successfulApps} of {appsWithConditionalRendering} apps"
            );
        }

        Console.WriteLine($"");

        // Conditional rendering stats (only if analyzing)
        if (analyzeConditionalRendering)
        {
            // Only show conditional rendering section if not failures-only OR if there are failures
            if (!failuresOnly || overallStats.FailedConversions > 0)
            {
                Console.WriteLine("Conditional Rendering:");
                Console.WriteLine($"  Total rules: {overallStats.TotalConditionalRules}");
                Console.WriteLine($"  Successfully converted to expressions: {overallStats.SuccessfulConversions}");
                Console.WriteLine($"  Failed to convert: {overallStats.FailedConversions}");

                if (overallStats.TotalConditionalRules > 0)
                {
                    var successPercentage =
                        (double)overallStats.SuccessfulConversions / overallStats.TotalConditionalRules * 100;
                    Console.WriteLine($"  Conversion success rate: {successPercentage:F1}%");
                }
            }
        }

        // Data processing stats (only if generating processors)
        if (generateProcessors)
        {
            // Only show data processing section if not failures-only OR if there are failures
            if (!failuresOnly || overallStats.FailedDataProcessingConversions > 0 || (verifyBuild && buildsFailed > 0))
            {
                Console.WriteLine($"\nData Processing:");
                Console.WriteLine($"  Total rules: {overallStats.TotalDataProcessingRules}");

                if (overallStats.TotalDataProcessingRules > 0)
                {
                    Console.WriteLine(
                        $"  Successfully converted to C#: {overallStats.SuccessfulDataProcessingConversions}"
                    );
                    Console.WriteLine(
                        $"  Failed to convert (require manual implementation): {overallStats.FailedDataProcessingConversions}"
                    );
                    Console.WriteLine($"  Generated processor files: {overallStats.GeneratedProcessorFiles}");

                    var dpSuccessPercentage =
                        (double)overallStats.SuccessfulDataProcessingConversions
                        / overallStats.TotalDataProcessingRules
                        * 100;
                    Console.WriteLine($"  Conversion success rate: {dpSuccessPercentage:F1}%");

                    if (verifyBuild && overallStats.GeneratedProcessorFiles > 0)
                    {
                        Console.WriteLine($"\nBuild Verification:");
                        Console.WriteLine($"  Successful builds: {buildsSucceeded}");
                        Console.WriteLine($"  Failed builds: {buildsFailed}");

                        if (buildsSucceeded + buildsFailed > 0)
                        {
                            var buildSuccessPercentage =
                                (double)buildsSucceeded / (buildsSucceeded + buildsFailed) * 100;
                            Console.WriteLine($"  Build success rate: {buildSuccessPercentage:F1}%");
                        }
                    }
                }
            }
        }

        // Overall conversion stats (only show if both types are being analyzed)
        if (analyzeConditionalRendering && generateProcessors)
        {
            var totalRules = overallStats.TotalConditionalRules + overallStats.TotalDataProcessingRules;
            if (totalRules > 0 && !failuresOnly)
            {
                var totalSuccessfulConversions =
                    overallStats.SuccessfulConversions + overallStats.SuccessfulDataProcessingConversions;
                var overallSuccessPercentage = (double)totalSuccessfulConversions / totalRules * 100;

                Console.WriteLine($"\nOverall:");
                Console.WriteLine($"  Total rules (all types): {totalRules}");
                Console.WriteLine($"  Successfully converted: {totalSuccessfulConversions}");
                Console.WriteLine($"  Overall conversion success rate: {overallSuccessPercentage:F1}%");
            }
        }

        Console.WriteLine(new string('=', 80));
    }
}
