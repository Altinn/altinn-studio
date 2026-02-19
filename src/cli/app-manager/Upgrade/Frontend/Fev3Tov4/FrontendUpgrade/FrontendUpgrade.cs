using System.CommandLine;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.Checks;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.CustomReceiptRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FooterRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.IndexFileRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutSetRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.SchemaRefRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.SettingsWriter;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FrontendUpgrade;

internal static class FrontendUpgrade
{
    private static void PrintError(string message)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine(message);
        Console.ResetColor();
    }

    private static void PrintWarning(string message)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine(message);
        Console.ResetColor();
    }

    public static Command GetUpgradeCommand(Option<string> projectFolderOption)
    {
        var targetVersionOption = new Option<string>(name: "--target-version")
        {
            Description = "The target version to upgrade to",
            DefaultValueFactory = _ => "4",
        };
        var indexFileOption = new Option<string>(name: "--index-file")
        {
            Description = "The name of the Index.cshtml file relative to --folder",
            DefaultValueFactory = _ => "App/views/Home/Index.cshtml",
        };
        var skipIndexFileUpgradeOption = new Option<bool>(name: "--skip-index-file-upgrade")
        {
            Description = "Skip Index.cshtml upgrade",
            DefaultValueFactory = _ => false,
        };
        var uiFolderOption = new Option<string>(name: "--ui-folder")
        {
            Description = "The folder containing layout files relative to --folder",
            DefaultValueFactory = _ => "App/ui/",
        };
        var textsFolderOption = new Option<string>(name: "--texts-folder")
        {
            Description = "The folder containing text files relative to --folder",
            DefaultValueFactory = _ => "App/config/texts/",
        };
        var layoutSetNameOption = new Option<string>(name: "--layout-set-name")
        {
            Description = "The name of the layout set to be created",
            DefaultValueFactory = _ => "form",
        };
        var applicationMetadataFileOption = new Option<string>(name: "--application-metadata")
        {
            Description = "The path of the applicationmetadata.json file relative to --folder",
            DefaultValueFactory = _ => "App/config/applicationmetadata.json",
        };
        var skipLayoutSetUpgradeOption = new Option<bool>(name: "--skip-layout-set-upgrade")
        {
            Description = "Skip layout set upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipSettingsUpgradeOption = new Option<bool>(name: "--skip-settings-upgrade")
        {
            Description = "Skip layout settings upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipLayoutUpgradeOption = new Option<bool>(name: "--skip-layout-upgrade")
        {
            Description = "Skip layout files upgrade",
            DefaultValueFactory = _ => false,
        };
        var convertGroupTitlesOption = new Option<bool>(name: "--convert-group-titles")
        {
            Description = "Convert 'title' in repeating groups to 'summaryTitle'",
            DefaultValueFactory = _ => false,
        };
        var skipSchemaRefUpgradeOption = new Option<bool>(name: "--skip-schema-ref-upgrade")
        {
            Description = "Skip schema reference upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipFooterUpgradeOption = new Option<bool>(name: "--skip-footer-upgrade")
        {
            Description = "Skip footer upgrade",
            DefaultValueFactory = _ => false,
        };
        var receiptLayoutSetNameOption = new Option<string>(name: "--receipt-layout-set-name")
        {
            Description = "The name of the layout set to be created for the custom receipt",
            DefaultValueFactory = _ => "receipt",
        };
        var skipCustomReceiptUpgradeOption = new Option<bool>(name: "--skip-custom-receipt-upgrade")
        {
            Description = "Skip custom receipt upgrade",
            DefaultValueFactory = _ => false,
        };
        var skipChecksOption = new Option<bool>(name: "--skip-checks")
        {
            Description = "Skip checks",
            DefaultValueFactory = _ => false,
        };

        var upgradeCommand = new Command("frontend-v4", "Upgrade an app from using App-Frontend v3 to v4")
        {
            projectFolderOption,
            targetVersionOption,
            indexFileOption,
            skipIndexFileUpgradeOption,
            uiFolderOption,
            textsFolderOption,
            layoutSetNameOption,
            applicationMetadataFileOption,
            skipLayoutSetUpgradeOption,
            skipSettingsUpgradeOption,
            skipLayoutUpgradeOption,
            convertGroupTitlesOption,
            skipSchemaRefUpgradeOption,
            skipFooterUpgradeOption,
            skipCustomReceiptUpgradeOption,
            receiptLayoutSetNameOption,
            skipChecksOption,
        };

        upgradeCommand.SetAction(
            async (ParseResult result) =>
            {
                var returnCode = 0;

                // Get simple options
                var skipIndexFileUpgrade = result.GetValue(skipIndexFileUpgradeOption);
                var skipLayoutSetUpgrade = result.GetValue(skipLayoutSetUpgradeOption);
                var skipSettingsUpgrade = result.GetValue(skipSettingsUpgradeOption);
                var skipLayoutUpgrade = result.GetValue(skipLayoutUpgradeOption);
                var skipSchemaRefUpgrade = result.GetValue(skipSchemaRefUpgradeOption);
                var skipFooterUpgrade = result.GetValue(skipFooterUpgradeOption);
                var skipCustomReceiptUpgrade = result.GetValue(skipCustomReceiptUpgradeOption);
                var skipChecks = result.GetValue(skipChecksOption);
                var layoutSetName = result.GetValue(layoutSetNameOption);
                var receiptLayoutSetName = result.GetValue(receiptLayoutSetNameOption);
                var convertGroupTitles = result.GetValue(convertGroupTitlesOption);
                var targetVersion = result.GetValue(targetVersionOption);

                var projectFolder = result.GetValue(projectFolderOption);
                if (projectFolder is null)
                {
                    PrintError("Project folder option is required.");
                    Environment.Exit(1);
                    return;
                }
                if (projectFolder == "CurrentDirectory")
                {
                    projectFolder = Directory.GetCurrentDirectory();
                }
                if (!Path.IsPathRooted(projectFolder))
                {
                    projectFolder = Path.Combine(Directory.GetCurrentDirectory(), projectFolder);
                }
                if (!Directory.Exists(projectFolder))
                {
                    PrintError(
                        $"{projectFolder} does not exist. Please supply location of project with --folder [path/to/project]"
                    );
                    Environment.Exit(1);
                    return;
                }

                // Get options requiring project folder
                var applicationMetadataFile = result.GetValue(applicationMetadataFileOption);
                if (applicationMetadataFile is null)
                {
                    PrintError("Application metadata file option is required.");
                    Environment.Exit(1);
                    return;
                }
                applicationMetadataFile = Path.Combine(projectFolder, applicationMetadataFile);

                var uiFolder = result.GetValue(uiFolderOption);
                if (uiFolder is null)
                {
                    PrintError("UI folder option is required.");
                    Environment.Exit(1);
                    return;
                }
                uiFolder = Path.Combine(projectFolder, uiFolder);

                var textsFolder = result.GetValue(textsFolderOption);
                if (textsFolder is null)
                {
                    PrintError("Texts folder option is required.");
                    Environment.Exit(1);
                    return;
                }
                textsFolder = Path.Combine(projectFolder, textsFolder);

                var indexFile = result.GetValue(indexFileOption);
                if (indexFile is null)
                {
                    PrintError("Index file option is required.");
                    Environment.Exit(1);
                    return;
                }
                indexFile = Path.Combine(projectFolder, indexFile);

                if (!skipIndexFileUpgrade && returnCode == 0)
                {
                    if (targetVersion is null)
                    {
                        PrintError("Target version option is required.");
                        Environment.Exit(1);
                        return;
                    }
                    returnCode = await IndexFileUpgrade(indexFile, targetVersion);
                }

                if (!skipLayoutSetUpgrade && returnCode == 0)
                {
                    if (layoutSetName is null)
                    {
                        PrintError("Layout set name option is required.");
                        Environment.Exit(1);
                        return;
                    }
                    returnCode = await LayoutSetUpgrade(uiFolder, layoutSetName, applicationMetadataFile);
                }

                if (!skipCustomReceiptUpgrade && returnCode == 0)
                {
                    if (receiptLayoutSetName is null)
                    {
                        PrintError("Receipt layout set name option is required.");
                        Environment.Exit(1);
                        return;
                    }
                    returnCode = await CustomReceiptUpgrade(uiFolder, receiptLayoutSetName);
                }

                if (!skipSettingsUpgrade && returnCode == 0)
                {
                    returnCode = await CreateMissingSettings(uiFolder);
                }

                if (!skipLayoutUpgrade && returnCode == 0)
                {
                    returnCode = await LayoutUpgrade(uiFolder, convertGroupTitles);
                }

                if (!skipFooterUpgrade && returnCode == 0)
                {
                    returnCode = await FooterUpgrade(uiFolder);
                }

                if (!skipSchemaRefUpgrade && returnCode == 0)
                {
                    if (targetVersion is null)
                    {
                        PrintError("Target version option is required.");
                        Environment.Exit(1);
                        return;
                    }
                    returnCode = await SchemaRefUpgrade(targetVersion, uiFolder, applicationMetadataFile, textsFolder);
                }

                if (!skipChecks && returnCode == 0)
                {
                    returnCode = RunChecks(textsFolder);
                }

                Environment.Exit(returnCode);
            }
        );

        return upgradeCommand;
    }

    private static async Task<int> IndexFileUpgrade(string indexFile, string targetVersion)
    {
        if (!File.Exists(indexFile))
        {
            PrintError(
                $"Index.cshtml file {indexFile} does not exist. Please supply location of project with --index-file [path/to/Index.cshtml]"
            );
            return 1;
        }

        var rewriter = new IndexFileUpgrader(indexFile, targetVersion);
        rewriter.Upgrade();
        await rewriter.Write();

        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }

        Console.WriteLine(
            warnings.Any() ? "Index.cshtml upgraded with warnings. Review the warnings above." : "Index.cshtml upgraded"
        );
        return 0;
    }

    private static async Task<int> LayoutSetUpgrade(
        string uiFolder,
        string layoutSetName,
        string applicationMetadataFile
    )
    {
        if (File.Exists(Path.Combine(uiFolder, "layout-sets.json")))
        {
            Console.WriteLine("Project already using layout sets. Skipping layout set upgrade.");
            return 0;
        }

        if (!Directory.Exists(uiFolder))
        {
            PrintError(
                $"Ui folder {uiFolder} does not exist. Please supply location of project with --ui-folder [path/to/ui/]"
            );
            return 1;
        }

        if (!File.Exists(applicationMetadataFile))
        {
            PrintError(
                $"Application metadata file {applicationMetadataFile} does not exist. Please supply location of project with --application-metadata [path/to/applicationmetadata.json]"
            );
            return 1;
        }

        var rewriter = new LayoutSetUpgrader(uiFolder, layoutSetName, applicationMetadataFile);
        rewriter.Upgrade();
        await rewriter.Write();

        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }
        Console.WriteLine(
            warnings.Any() ? "Layout-sets upgraded with warnings. Review the warnings above." : "Layout sets upgraded"
        );
        return 0;
    }

    private static async Task<int> CustomReceiptUpgrade(string uiFolder, string receiptLayoutSetName)
    {
        if (!Directory.Exists(uiFolder))
        {
            PrintError(
                $"Ui folder {uiFolder} does not exist. Please supply location of project with --ui-folder [path/to/ui/]"
            );
            return 1;
        }

        if (!File.Exists(Path.Combine(uiFolder, "layout-sets.json")))
        {
            PrintError("Converting to layout sets is required before upgrading custom receipt.");
            return 1;
        }

        if (Directory.Exists(Path.Combine(uiFolder, receiptLayoutSetName)))
        {
            Console.WriteLine(
                $"A layout set with the name {receiptLayoutSetName} already exists. Skipping custom receipt upgrade."
            );
            return 0;
        }

        var rewriter = new CustomReceiptUpgrader(uiFolder, receiptLayoutSetName);
        rewriter.Upgrade();
        await rewriter.Write();

        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }
        Console.WriteLine(
            warnings.Any()
                ? "Custom receipt upgraded with warnings. Review the warnings above."
                : "Custom receipt upgraded"
        );
        return 0;
    }

    private static async Task<int> CreateMissingSettings(string uiFolder)
    {
        if (!Directory.Exists(uiFolder))
        {
            PrintError(
                $"Ui folder {uiFolder} does not exist. Please supply location of project with --ui-folder [path/to/ui/]"
            );
            return 1;
        }

        if (!File.Exists(Path.Combine(uiFolder, "layout-sets.json")))
        {
            PrintError("Converting to layout sets is required before upgrading settings.");
            return 1;
        }

        var rewriter = new SettingsCreator(uiFolder);
        rewriter.Upgrade();
        await rewriter.Write();

        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }
        Console.WriteLine(
            warnings.Any()
                ? "Layout settings upgraded with warnings. Review the warnings above."
                : "Layout settings upgraded"
        );
        return 0;
    }

    private static async Task<int> LayoutUpgrade(string uiFolder, bool convertGroupTitles)
    {
        if (!Directory.Exists(uiFolder))
        {
            PrintError(
                $"Ui folder {uiFolder} does not exist. Please supply location of project with --ui-folder [path/to/ui/]"
            );
            return 1;
        }

        if (!File.Exists(Path.Combine(uiFolder, "layout-sets.json")))
        {
            PrintError("Converting to layout sets is required before upgrading layouts.");
            return 1;
        }

        var rewriter = new LayoutUpgrader(uiFolder, convertGroupTitles);
        rewriter.Upgrade();
        await rewriter.Write();

        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }

        Console.WriteLine(
            warnings.Any() ? "Layout files upgraded with warnings. Review the warnings above." : "Layout files upgraded"
        );
        return 0;
    }

    private static async Task<int> FooterUpgrade(string uiFolder)
    {
        if (!Directory.Exists(uiFolder))
        {
            PrintError(
                $"Ui folder {uiFolder} does not exist. Please supply location of project with --ui-folder [path/to/ui/]"
            );
            return 1;
        }

        var rewriter = new FooterUpgrader(uiFolder);
        rewriter.Upgrade();
        await rewriter.Write();

        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }

        Console.WriteLine(
            warnings.Any() ? "Footer upgraded with warnings. Review the warnings above." : "Footer upgraded"
        );
        return 0;
    }

    private static async Task<int> SchemaRefUpgrade(
        string targetVersion,
        string uiFolder,
        string applicationMetadataFile,
        string textsFolder
    )
    {
        if (!Directory.Exists(uiFolder))
        {
            PrintError(
                $"Ui folder {uiFolder} does not exist. Please supply location of project with --ui-folder [path/to/ui/]"
            );
            return 1;
        }

        if (!Directory.Exists(textsFolder))
        {
            PrintError(
                $"Texts folder {textsFolder} does not exist. Please supply location of project with --texts-folder [path/to/texts/]"
            );
            return 1;
        }

        if (!File.Exists(Path.Combine(uiFolder, "layout-sets.json")))
        {
            PrintError("Converting to layout sets is required before upgrading schema refereces.");
            return 1;
        }

        if (!File.Exists(applicationMetadataFile))
        {
            PrintError(
                $"Application metadata file {applicationMetadataFile} does not exist. Please supply location of project with --application-metadata [path/to/applicationmetadata.json]"
            );
            return 1;
        }

        var rewriter = new SchemaRefUpgrader(targetVersion, uiFolder, applicationMetadataFile, textsFolder);
        rewriter.Upgrade();
        await rewriter.Write();

        var warnings = rewriter.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }

        Console.WriteLine(
            warnings.Any()
                ? "Schema references upgraded with warnings. Review the warnings above."
                : "Schema references upgraded"
        );
        return 0;
    }

    private static int RunChecks(string textsFolder)
    {
        if (!Directory.Exists(textsFolder))
        {
            PrintError(
                $"Texts folder {textsFolder} does not exist. Please supply location of project with --texts-folder [path/to/texts/]"
            );
            return 1;
        }

        Console.WriteLine("Running checks...");
        var checker = new Checker(textsFolder);

        checker.CheckTextDataModelReferences();

        var warnings = checker.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }

        Console.WriteLine(
            warnings.Any()
                ? "Checks finished with warnings. Review the warnings above."
                : "Checks finished without warnings"
        );
        return 0;
    }
}
