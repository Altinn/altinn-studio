using System.Text.Json;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>Records what <see cref="AppCollector"/> found for an app in the api-usage tables.</summary>
internal static class AppUsageRows
{
    /// <summary>Records the result file of an app, and returns why the app could not be analyzed, or <c>null</c>.</summary>
    public static string? Record(AppRecorder recorder, string resultFile)
    {
        AppUsage usage;
        using (FileStream stream = File.OpenRead(resultFile))
        {
            usage =
                JsonSerializer.Deserialize(stream, ApiUsageJsonContext.Default.AppUsage)
                ?? throw new JsonException("The result is null.");
        }

        if (usage.Project is not null)
        {
            using TableRows apps = recorder.Rows(
                "api_usage_apps",
                [
                    "project",
                    "library_package",
                    "library_version",
                    "restore_error",
                    "compile_errors",
                    "sample_errors",
                    "load_failures",
                    "test_projects",
                ]
            );
            apps.Add(
                usage.Project,
                usage.LibraryPackage,
                usage.LibraryVersion,
                usage.RestoreError,
                usage.CompileErrors,
                Lines(usage.SampleErrors),
                Lines(usage.LoadFailures),
                Lines(usage.TestProjects)
            );
        }

        using (
            TableRows uses = recorder.Rows(
                "api_usage_uses",
                ["symbol", "assembly", "kind", "source", "count", "first_location"]
            )
        )
        {
            foreach (SymbolUse use in usage.Uses)
            {
                uses.Add(use.Symbol, use.Assembly, use.Kind, use.Source, use.Count, use.FirstLocation);
            }
        }

        using (
            TableRows packageUses = recorder.Rows(
                "api_usage_package_uses",
                ["package", "version", "assembly", "symbol", "kind"],
                ignoreDuplicates: true
            )
        )
        {
            foreach (PackageUse package in usage.Packages)
            {
                foreach (PackageReferenceUse reference in package.References)
                {
                    packageUses.Add(
                        package.Package,
                        package.Version,
                        package.Assembly,
                        reference.Symbol,
                        reference.Kind
                    );
                }
            }
        }

        return usage.Failure;
    }

    private static string? Lines(IReadOnlyList<string> values) => values.Count == 0 ? null : string.Join('\n', values);
}
