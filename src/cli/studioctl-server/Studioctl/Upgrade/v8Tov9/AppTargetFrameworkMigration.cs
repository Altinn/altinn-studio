using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>Plans the upgrade of the app's explicit, unconditional target framework.</summary>
internal static class AppTargetFrameworkMigration
{
    private static readonly Regex _frameworkPattern = new(
        @"^net(?<version>\d+\.\d+)(?<platform>-[a-z][a-z0-9.]*)?$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        TimeSpan.FromSeconds(1)
    );

    internal sealed record Plan(string CurrentFramework, string TargetFramework);

    internal sealed record Inspection(Plan? Plan, MigrationResult Result);

    internal static Inspection Inspect(string projectFile, string targetFramework)
    {
        var project = XDocument.Load(projectFile);
        var frameworks = project.Descendants("TargetFramework").ToList();
        if (
            frameworks.Count != 1
            || frameworks[0].Parent?.Name != "PropertyGroup"
            || frameworks[0].Parent?.Parent != project.Root
            || frameworks[0].AncestorsAndSelf().Any(element => element.Attribute("Condition") is not null)
            || HasCustomFrameworkSetup(project)
            || HasImportedFrameworkSetup(projectFile)
        )
        {
            return ManualAction(
                $"The app's target framework is inherited, conditional, or uses a custom import. Set one explicit, unconditional TargetFramework to {targetFramework} in the project and resolve imported framework settings manually before updating its packages, Dockerfile, and dependent projects."
            );
        }

        var current = frameworks[0].Value.Trim();
        var currentMatch = _frameworkPattern.Match(current);
        var targetMatch = _frameworkPattern.Match(targetFramework);
        if (!currentMatch.Success || !targetMatch.Success)
        {
            return ManualAction(
                $"The app targets '{current}'. Set a single literal TargetFramework to {targetFramework} manually before updating its packages, Dockerfile, and dependent projects."
            );
        }

        if (Version.Parse(currentMatch.Groups["version"].Value) > Version.Parse(targetMatch.Groups["version"].Value))
        {
            return ManualAction(
                $"Kept newer target framework {current}. Check its Altinn.App compatibility manually before updating its packages, Dockerfile, and dependent projects; this upgrade targets {targetFramework}."
            );
        }

        var desired = targetMatch.Groups["platform"].Success
            ? targetFramework
            : targetFramework + currentMatch.Groups["platform"].Value;
        return new Inspection(new Plan(current, desired), new MigrationResult());
    }

    private static Inspection ManualAction(string message) =>
        new(null, new MigrationResult([new UpgradeMessage(message, UpgradeMessageStatus.Todo)]));

    internal static string BaseFramework(string framework) =>
        "net" + _frameworkPattern.Match(framework).Groups["version"].Value;

    private static bool HasCustomFrameworkSetup(XDocument document) =>
        document
            .Descendants()
            .Any(element =>
                element.Name.LocalName
                    is "TargetFrameworks"
                        or "Import"
                        or "DirectoryBuildPropsPath"
                        or "DirectoryBuildTargetsPath"
                        or "ImportDirectoryBuildProps"
                        or "ImportDirectoryBuildTargets"
            );

    private static bool HasImportedFrameworkSetup(string projectFile)
    {
        // Only inspect the two standard directory imports. Custom imports require manual action;
        // interpreting their paths and conditions would amount to evaluating MSBuild again.
        foreach (var fileName in new[] { "Directory.Build.props", "Directory.Build.targets" })
        {
            for (
                var directory = Path.GetDirectoryName(Path.GetFullPath(projectFile));
                directory is not null;
                directory = Path.GetDirectoryName(directory)
            )
            {
                var path = Path.Combine(directory, fileName);
                if (!File.Exists(path))
                    continue;
                var document = XDocument.Load(path);
                if (document.Descendants("TargetFramework").Any() || HasCustomFrameworkSetup(document))
                    return true;
                break;
            }
        }
        return false;
    }
}
