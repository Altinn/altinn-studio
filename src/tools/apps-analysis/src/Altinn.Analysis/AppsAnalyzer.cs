using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using CsvHelper;
using Microsoft.CodeAnalysis.Text;
using Spectre.Console;

namespace Altinn.Analysis;

public sealed record AnalysisConfig(string Directory, int MaxParallelism);

public sealed class AppsAnalyzer
{
    private readonly AnalysisConfig _config;

    private DirectoryInfo? _directory;
    private int _parallelism;

    public AppsAnalyzer(AnalysisConfig config)
    {
        _config = config;
    }

    private bool VerifyConfig()
    {
        var table = new Table();
        table.Border(TableBorder.None);
        table.AddColumn(new TableColumn(""));
        table.AddColumn(new TableColumn(""));

        _parallelism = _config.MaxParallelism;
        var directory = Path.GetFullPath(
            _config.Directory.Replace(
                "~",
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
            )
        );
        table.AddRow(
            new Markup(nameof(FetchConfig.Directory)),
            new Markup($"= [bold]{directory}[/]")
        );
        table.AddRow(new Markup("Parallelism"), new Markup($"= [bold]{_parallelism}[/]"));
        AnsiConsole.Write(table);
        AnsiConsole.WriteLine();

        if (!Debugger.IsAttached)
        {
            var proceed = AnsiConsole.Prompt(new ConfirmationPrompt($"Continue?"));
            return proceed;
        }

        return true;
    }

    public async Task Analyze(CancellationToken cancellationToken)
    {
        AnsiConsole.MarkupLine("[blue]Analyzing Altinn apps[/]... Config:");
        if (!VerifyConfig())
            return;

        var directory = Path.GetFullPath(
            _config.Directory.Replace(
                "~",
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
            )
        );
        _directory = new DirectoryInfo(directory);
        if (!_directory.Exists)
        {
            AnsiConsole.MarkupLine(
                $"Directory for downloaded apps [red]doesn't exist[/]: [bold]{directory}[/]"
            );
            return;
        }

        var repos = GetRepos(cancellationToken);

        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Rule($"Analysing [blue]{repos.Count}[/] apps").LeftJustified());

        AppAnalysisResult[]? results = null;
        await AnsiConsole
            .Progress()
            .Columns(
                new TaskDescriptionColumn(),
                new ProgressBarColumn(),
                new ElapsedTimeColumn(),
                new SpinnerColumn()
            )
            .HideCompleted(true)
            .AutoClear(true)
            .StartAsync(async ctx =>
            {
                results = await AnalyzeRepos(ctx, repos, cancellationToken);
            });

        Debug.Assert(results is not null);
        AnsiConsole.MarkupLine($"[green]Successfully[/] analyzed [blue]{results.Length}[/] apps");

        // Ample opportunity for SIMD below...
        var timedOut = results.Count(r => r.TimedOut is true);
        var invalidProjects = results.Count(r => r.ValidProject is false);
        var failedBuilds = results.Count(r => r.Builds is false);
        var noAppLib = results.Count(r => r.HasAppLib is false);
        var oldAppLib = results.Count(r => r.HasLatestAppLib is false);
        var aOkay = results.Count(r => r.OK);

        AnsiConsole.MarkupLine("[green]Overview[/]");
        AnsiConsole.WriteLine();
        AnsiConsole.Write(
            new BarChart()
                .Width(60)
                .Label("[green bold underline]Analysis[/]")
                .LeftAlignLabel()
                .AddItem("Timed out", timedOut, Color.Red)
                .AddItem("Invalid project", invalidProjects, Color.Red)
                .AddItem("Failed builds", failedBuilds, Color.Red)
                .AddItem("Missing applib", noAppLib, Color.Red)
                .AddItem("Old applib", oldAppLib, Color.Yellow)
                .AddItem("On applib v8", aOkay, Color.Green)
        );

        AnsiConsole.WriteLine();
        AnsiConsole.MarkupLine("[green]Symbol references totals[/]");
        var symbolReferences = results
            .SelectMany(r =>
                r.SymbolReferenceCountsBySymbol.Select(kvp =>
                    (Symbol: kvp.Key, References: kvp.Value.AsReadOnly(), App: r.AppRepository)
                )
            )
            .GroupBy(r => r.Symbol)
            .Select(grp => new
            {
                Symbol = grp.Key,
                Count = grp.Sum(x => x.References.Count),
                Apps = string.Join(
                    ", ",
                    grp.Where(x => x.References.Count > 0)
                        .Select(x => $"{x.App.Org}/{x.App.Name}")
                        .Order()
                ),
            })
            .OrderByDescending(x => x.Count)
            .ToArray();

        var table = new Table();
        table.Border(TableBorder.Rounded);
        table.AddColumn(new TableColumn("Symbol"));
        table.AddColumn(new TableColumn("Reference count"));
        table.AddColumn(new TableColumn("Apps"));

        foreach (var item in symbolReferences)
        {
            table.AddRow(item.Symbol, item.Count.ToString(CultureInfo.InvariantCulture), item.Apps);
        }
        AnsiConsole.Write(table);

        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[blue]Writing code dump for references[/]...");
            var data = results
                .SelectMany(re =>
                    re.SymbolReferenceCountsBySymbol.SelectMany(kvp =>
                        kvp.Value.Select(r =>
                            (Symbol: kvp.Key, App: re.AppRepository, Reference: r)
                        )
                    )
                )
                .GroupBy(r => r.Symbol);

            foreach (var item in data)
            {
                var refToFind = item.Key;
                var filePath = Path.Join(
                    _directory.FullName,
                    $"dump_{refToFind.Substring(2).Replace('.', '_')}.md"
                );
                if (File.Exists(filePath))
                    File.Delete(filePath);
                await using var file = File.OpenWrite(filePath);
                await using var writer = new StreamWriter(file);
                foreach (var reference in item)
                {
                    foreach (var location in reference.Reference.Locations)
                    {
                        var documentPath = location.Document.FilePath;
                        var code = await location.Document.GetTextAsync(cancellationToken);
                        var lineNumber = code
                            .Lines.GetLineFromPosition(location.Location.SourceSpan.Start)
                            .LineNumber;
                        var codeLink = $"{documentPath} {lineNumber + 1}";
                        var span = ExpandSpanToIncludeSurroundingLines(
                            code,
                            location.Location.SourceSpan
                        );
                        var codeWithContext = code.GetSubText(span);
                        await writer.WriteLineAsync(
                            $"\n{codeLink}: \n```csharp\n{codeWithContext.ToString()}\n```\n"
                        );
                    }
                }
            }

            AnsiConsole.MarkupLine($"[green]Successfully[/] wrote code dumps for references");
        }

        {
            AnsiConsole.WriteLine();
            AnsiConsole.MarkupLine("[blue]Writing CSV report[/]...");

            // Write CSV report to analysis directory
            var filename = Path.Combine(_directory.FullName, "apps.csv");
            await using var writer = new StreamWriter(filename);
            await using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);

            var records = results
                .Select(r => new AppCsvRow
                {
                    Org = r.AppRepository.Org,
                    Name = r.AppRepository.Name,
                    TimedOut = r.TimedOut,
                    Builds = r.Builds,
                    AppLibVersion = r.AppLibVersion,
                    WarningCount = r.WarningCount,
                })
                .ToArray();
            await csv.WriteRecordsAsync(records, cancellationToken);

            AnsiConsole.MarkupLine(
                $"[green]Successfully[/] wrote CSV report to: [bold]{filename}[/]"
            );
        }
    }

    private List<AppRepository> GetRepos(CancellationToken cancellationToken)
    {
        Debug.Assert(_directory is not null);

        var result = new List<AppRepository>(64);
        var orgsCounter = 0;
        foreach (var orgDir in Directory.EnumerateDirectories(_directory.FullName))
        {
            var org = orgDir.Substring(orgDir.LastIndexOf(Path.DirectorySeparatorChar) + 1);
            cancellationToken.ThrowIfCancellationRequested();

            var reposCounter = 0;
            foreach (var repoDir in Directory.EnumerateDirectories(orgDir))
            {
                var name = repoDir.Substring(repoDir.LastIndexOf(Path.DirectorySeparatorChar) + 1);
                var repoDirInfo = new DirectoryInfo(
                    Path.Combine(repoDir, Constants.MainBranchFolder)
                );
                if (!repoDirInfo.Exists)
                {
                    AnsiConsole.MarkupLine(
                        $"Couldn't find main branch folder for repo: '{repoDirInfo.Name}'"
                    );
                    continue;
                }
                result.Add(new AppRepository(repoDirInfo, org, name));
                reposCounter++;

                if (reposCounter == Constants.LimitRepos)
                    break;
            }

            orgsCounter++;

            if (orgsCounter == Constants.LimitOrgs)
                break;
        }

        return result;
    }

    private async Task<AppAnalysisResult[]> AnalyzeRepos(
        ProgressContext ctx,
        List<AppRepository> repos,
        CancellationToken cancellationToken
    )
    {
        using var appAnalyzer = new AppAnalyzer(_parallelism);

        var results = new ConcurrentBag<AppAnalysisResult>();
        var options = new ParallelOptions
        {
            CancellationToken = cancellationToken,
            MaxDegreeOfParallelism = _parallelism,
        };
        await Parallel.ForEachAsync(
            repos,
            options,
            async (repo, cancellationToken) =>
            {
                var (dir, org, name) = repo;
                var task = ctx.AddTask($"[green]{org}/{name}[/]", autoStart: false, maxValue: 1);
                task.IsIndeterminate = true;
                task.StartTask();

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromMinutes(1));
                cancellationToken = cts.Token;

                // Doc for selecting refs:
                // https://github.com/dotnet/roslyn/blob/7ead97fc404947f81a4ee3c6543212d60fddfd03/src/RoslynAnalyzers/Microsoft.CodeAnalysis.BannedApiAnalyzers/BannedApiAnalyzers.Help.md
                string[] findRefs =
                [
                    // "M:Altinn.App.Core.Internal.Auth.IAuthorizationClient.GetUserRoles(System.Int32,System.Int32)",
                    // "T:Altinn.App.Core.Features.IValidator",
                    "T:Altinn.App.Core.Infrastructure.Clients.Storage.DataClient",
                    "M:Altinn.App.Core.Infrastructure.Clients.Storage.DataClient.#ctor",
                    // "T:Altinn.App.Core.Features.IProcessTaskEnd",
                ];
                try
                {
                    await appAnalyzer.Analyze(repo, findRefs, results, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    results.Add(new(repo, timedOut: true));
                }

                task.Increment(1.0);
                task.StopTask();
            }
        );

        return results.ToArray();
    }

    private sealed record AppCsvRow
    {
        public required string Org { get; init; }
        public required string Name { get; init; }
        public required bool? TimedOut { get; init; }
        public required bool? Builds { get; init; }
        public required string? AppLibVersion { get; init; }
        public required uint? WarningCount { get; init; }
    }

    private static TextSpan ExpandSpanToIncludeSurroundingLines(
        SourceText sourceText,
        TextSpan originalSpan
    )
    {
        // Get the lines that contain the start and end of the original span
        var startLine = sourceText.Lines.GetLineFromPosition(originalSpan.Start);
        var endLine = sourceText.Lines.GetLineFromPosition(originalSpan.End);

        // Get the line numbers
        int startLineNumber = startLine.LineNumber;
        int endLineNumber = endLine.LineNumber;

        // Expand to include one line before and after (with bounds checking)
        int expandedStartLineNumber = Math.Max(0, startLineNumber - 1);
        int expandedEndLineNumber = Math.Min(sourceText.Lines.Count - 1, endLineNumber + 1);

        // Get the expanded lines
        var expandedStartLine = sourceText.Lines[expandedStartLineNumber];
        var expandedEndLine = sourceText.Lines[expandedEndLineNumber];

        // Create the expanded TextSpan
        return TextSpan.FromBounds(expandedStartLine.Start, expandedEndLine.End);
    }
}
