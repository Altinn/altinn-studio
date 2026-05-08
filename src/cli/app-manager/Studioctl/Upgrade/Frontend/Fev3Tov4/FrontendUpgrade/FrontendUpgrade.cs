using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.Checks;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.CustomReceiptRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FooterRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.IndexFileRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.LayoutSetRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.SchemaRefRewriter;
using Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.SettingsWriter;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.FrontendUpgrade;

internal sealed record FrontendUpgradeOptions(
    string ProjectFolder,
    string TargetVersion,
    string IndexFile,
    string UiFolder,
    string TextsFolder,
    string LayoutSetName,
    string ApplicationMetadataFile,
    string ReceiptLayoutSetName,
    bool SkipIndexFileUpgrade,
    bool SkipLayoutSetUpgrade,
    bool SkipSettingsUpgrade,
    bool SkipLayoutUpgrade,
    bool ConvertGroupTitles,
    bool SkipSchemaRefUpgrade,
    bool SkipFooterUpgrade,
    bool SkipCustomReceiptUpgrade,
    bool SkipChecks,
    TextWriter Output,
    TextWriter Error,
    CancellationToken CancellationToken
);

internal static class FrontendUpgrade
{
    private static void PrintError(string message)
    {
        UpgradeConsole.WriteErrorLine(message);
    }

    private static void PrintWarning(string message)
    {
        UpgradeConsole.WriteLine(message);
    }

    internal static async Task<int> RunAsync(FrontendUpgradeOptions options)
    {
        using var outputScope = UpgradeConsole.Use(options.Output, options.Error);
        var projectFolder = options.ProjectFolder;
        if (!Directory.Exists(projectFolder))
        {
            PrintError($"Project folder does not exist: {projectFolder}");
            return 1;
        }

        var applicationMetadataFile = Path.Combine(projectFolder, options.ApplicationMetadataFile);
        var uiFolder = Path.Combine(projectFolder, options.UiFolder);
        var textsFolder = Path.Combine(projectFolder, options.TextsFolder);
        var indexFile = Path.Combine(projectFolder, options.IndexFile);

        var returnCode = 0;
        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipIndexFileUpgrade)
            returnCode = await IndexFileUpgrade(indexFile, options.TargetVersion);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipLayoutSetUpgrade && returnCode == 0)
            returnCode = await LayoutSetUpgrade(uiFolder, options.LayoutSetName, applicationMetadataFile);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipCustomReceiptUpgrade && returnCode == 0)
            returnCode = await CustomReceiptUpgrade(uiFolder, options.ReceiptLayoutSetName);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipSettingsUpgrade && returnCode == 0)
            returnCode = await CreateMissingSettings(uiFolder);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipLayoutUpgrade && returnCode == 0)
            returnCode = await LayoutUpgrade(uiFolder, options.ConvertGroupTitles);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipFooterUpgrade && returnCode == 0)
            returnCode = await FooterUpgrade(uiFolder);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipSchemaRefUpgrade && returnCode == 0)
            returnCode = await SchemaRefUpgrade(options.TargetVersion, uiFolder, applicationMetadataFile, textsFolder);

        options.CancellationToken.ThrowIfCancellationRequested();
        if (!options.SkipChecks && returnCode == 0)
            returnCode = RunChecks(textsFolder);

        return returnCode;
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

        UpgradeConsole.WriteLine(
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
            UpgradeConsole.WriteLine("Project already using layout sets. Skipping layout set upgrade.");
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
        UpgradeConsole.WriteLine(
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
            UpgradeConsole.WriteLine(
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
        UpgradeConsole.WriteLine(
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
        UpgradeConsole.WriteLine(
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

        UpgradeConsole.WriteLine(
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

        UpgradeConsole.WriteLine(
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

        UpgradeConsole.WriteLine(
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

        UpgradeConsole.WriteLine("Running checks...");
        var checker = new Checker(textsFolder);

        checker.CheckTextDataModelReferences();

        var warnings = checker.GetWarnings();
        foreach (var warning in warnings)
        {
            PrintWarning(warning);
        }

        UpgradeConsole.WriteLine(
            warnings.Any()
                ? "Checks finished with warnings. Review the warnings above."
                : "Checks finished without warnings"
        );
        return 0;
    }
}
