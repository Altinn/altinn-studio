using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Altinn.Studio.Common.Domain.App;

namespace Altinn.Studio.Fleet.Analysis.ApiUsage;

/// <summary>What a read of an app library version found, as the child process writes it.</summary>
/// <param name="CommitId">For the source, the commit its checkout is at.</param>
/// <param name="Entries">The types and members.</param>
internal sealed record LibraryApi(string? CommitId, IReadOnlyList<LibraryApiEntry> Entries);

/// <summary>
/// The app library versions whose public API api-usage records, as its items: each version the apps use, read from
/// its packages once, and the app library in a checkout, as <see cref="Source"/>, read on every run that gives one.
/// </summary>
internal static class LibraryVersions
{
    /// <summary>The version that the public API of a checkout is recorded under.</summary>
    public const string Source = "source";

    /// <summary>
    /// Forgets the versions no app uses any more, and plans to read those the apps use that are not read yet or whose
    /// read failed, or all of them with <paramref name="force"/>, and <paramref name="source"/> when there is one.
    /// </summary>
    public static ItemPlan Plan(AnalysisTables tables, LibrarySource? source, bool force)
    {
        const string Unused = """
            version <> $source AND version NOT IN
                (SELECT library_version FROM api_usage_apps WHERE library_version IS NOT NULL)
            """;
        int removed = tables.Execute($"DELETE FROM api_usage_library_versions WHERE {Unused}", ("$source", Source));
        tables.Execute($"DELETE FROM api_usage_library_api WHERE {Unused}", ("$source", Source));
        tables.Execute($"DELETE FROM api_usage_library_api_exposes WHERE {Unused}", ("$source", Source));

        // A version is published either as the library's packages or, by a build of a pull request, as their
        // Experimental packages, whose versions name the pull request. So the apps on a version agree on which.
        List<(string Version, string Package, bool Pending)> used = tables.Query(
            """
            SELECT a.library_version, min(a.library_package),
                max($force OR v.version IS NULL OR v.failure IS NOT NULL)
            FROM api_usage_apps a
            LEFT JOIN api_usage_library_versions v ON v.version = a.library_version
            WHERE a.library_version IS NOT NULL AND a.library_package IS NOT NULL
            GROUP BY a.library_version
            ORDER BY a.library_version
            """,
            reader => (reader.GetString(0), reader.GetString(1), reader.GetBoolean(2)),
            ("$force", force)
        );
        List<AnalysisItem> pending =
        [
            .. used.Where(u => u.Pending).Select(u => new AnalysisItem(u.Version, $"{u.Package}/{u.Version}")),
        ];
        if (source is not null)
        {
            pending.Add(new AnalysisItem(Source, source.Root));
        }

        return new ItemPlan(pending, used.Count + (source is null ? 0 : 1), removed);
    }

    /// <summary>
    /// Reads a version's public API, in the child process, and writes it to a file: from the packages of the
    /// <c>package/version</c> in the item's input, or for <see cref="Source"/>, from the checkout in it. MSBuild must
    /// be registered.
    /// </summary>
    public static async Task Read(AnalysisItem item, string resultFile, CancellationToken cancellationToken)
    {
        LibraryApi api;
        if (item.Key == Source)
        {
            LibrarySource source =
                LibrarySource.Find(item.Input)
                ?? throw new FleetException($"{item.Input} has no app library, so its public API cannot be read.");
            string? commitId = await CommitId(source.Root, cancellationToken);
            api = new LibraryApi(commitId, await LibraryApiReader.ReadSource(source, cancellationToken));
        }
        else
        {
            AltinnAppPackage package =
                Package(item.Input)
                ?? throw new FleetException($"{item.Input} is not an Altinn.App package and version.");
            api = new LibraryApi(null, await LibraryApiReader.ReadPublished(package, cancellationToken));
        }

        await using FileStream stream = File.Create(resultFile);
        await JsonSerializer.SerializeAsync(stream, api, ApiUsageJsonContext.Default.LibraryApi, cancellationToken);
    }

    /// <summary>
    /// Replaces the public API recorded for a version with what a read found. A read that failed keeps the API an
    /// earlier read found, and only says why it failed, so that a version that stops compiling for a moment keeps one.
    /// </summary>
    /// <returns>Why the read failed, or <c>null</c>.</returns>
    public static string? Record(AnalysisTables tables, AnalysisItem item, AnalysisOutcome outcome)
    {
        if (outcome.ResultFile is null)
        {
            string failure = outcome.Failure ?? "The analysis wrote no result.";
            tables.Execute(
                """
                INSERT INTO api_usage_library_versions (version, package, failure) VALUES ($version, $package, $failure)
                ON CONFLICT (version) DO UPDATE SET package = excluded.package, failure = excluded.failure
                """,
                ("$version", item.Key),
                ("$package", Package(item.Input)?.Name),
                ("$failure", failure)
            );
            return failure;
        }

        LibraryApi api;
        using (FileStream stream = File.OpenRead(outcome.ResultFile))
        {
            api =
                JsonSerializer.Deserialize(stream, ApiUsageJsonContext.Default.LibraryApi)
                ?? throw new JsonException("The result is null.");
        }

        tables.Execute("DELETE FROM api_usage_library_api WHERE version = $version", ("$version", item.Key));
        tables.Execute("DELETE FROM api_usage_library_api_exposes WHERE version = $version", ("$version", item.Key));
        tables.Execute(
            """
            INSERT OR REPLACE INTO api_usage_library_versions (version, package, commit_id, read_at, failure)
            VALUES ($version, $package, $commitId, $readAt, NULL)
            """,
            ("$version", item.Key),
            ("$package", Package(item.Input)?.Name),
            ("$commitId", api.CommitId),
            (
                "$readAt",
                DateTimeOffset.UtcNow.UtcDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture)
            )
        );
        using TableRows entries = tables.Rows(
            "api_usage_library_api",
            [
                "version",
                "symbol",
                "assembly",
                "kind",
                "namespace",
                "containing_type",
                "visible",
                "obsolete",
                "extension_point",
                "file",
                "line",
            ]
        );
        using TableRows exposes = tables.Rows("api_usage_library_api_exposes", ["version", "symbol", "exposed"]);
        foreach (LibraryApiEntry e in api.Entries)
        {
            entries.Add(
                item.Key,
                e.Symbol,
                e.Assembly,
                e.Kind,
                e.Namespace,
                e.ContainingType,
                e.Visible,
                e.Obsolete,
                e.ExtensionPoint,
                e.File,
                e.Line
            );
            foreach (string exposed in e.Exposes)
            {
                exposes.Add(item.Key, e.Symbol, exposed);
            }
        }

        return null;
    }

    /// <summary>The Altinn.App package and version in an item's <c>package/version</c> input, or <c>null</c>.</summary>
    private static AltinnAppPackage? Package(string input) =>
        input.Split('/') is [string name, string version]
        && AltinnAppPackage.TryParse(new PackageReference(name, version), out AltinnAppPackage? package)
            ? package
            : null;

    /// <summary>The commit a folder's checkout is at, with <c>+changes</c> when it has uncommitted ones.</summary>
    private static async Task<string?> CommitId(string folder, CancellationToken cancellationToken)
    {
        string? head = await Git(folder, ["rev-parse", "HEAD"], cancellationToken);
        if (head is null)
        {
            return null;
        }

        string? changes = await Git(folder, ["status", "--porcelain", "--untracked-files=no"], cancellationToken);
        return changes is { Length: > 0 } ? $"{head}+changes" : head;
    }

    private static async Task<string?> Git(string folder, string[] arguments, CancellationToken cancellationToken)
    {
        var start = new ProcessStartInfo("git")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        start.ArgumentList.Add("-C");
        start.ArgumentList.Add(folder);
        foreach (string argument in arguments)
        {
            start.ArgumentList.Add(argument);
        }

        try
        {
            using Process process = Process.Start(start) ?? throw new InvalidOperationException("git did not start.");
            Task<string> error = process.StandardError.ReadToEndAsync(cancellationToken);
            string output = await process.StandardOutput.ReadToEndAsync(cancellationToken);
            await error;
            await process.WaitForExitAsync(cancellationToken);
            return process.ExitCode == 0 ? output.Trim() : null;
        }
        catch (Exception ex) when (ex is System.ComponentModel.Win32Exception or InvalidOperationException)
        {
            return null;
        }
    }
}
