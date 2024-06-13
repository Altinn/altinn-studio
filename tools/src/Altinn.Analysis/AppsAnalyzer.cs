using System.Collections.Concurrent;
using System.Collections.Specialized;
using System.Diagnostics;
using Buildalyzer;
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

        _parallelism = Math.Min(Constants.LimitMaxParallelism, _config.MaxParallelism);
        table.AddRow(new Markup(nameof(FetchConfig.Directory)), new Markup($"= [bold]{_config.Directory}[/]"));
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

        _directory = new DirectoryInfo(_config.Directory);
        if (!_directory.Exists)
        {
            AnsiConsole.MarkupLine(
                $"Directory for downloaded apps [red]doesn't exist[/]: [bold]{_config.Directory}[/]"
            );
            return;
        }

        var repos = GetRepos(cancellationToken);

        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Rule($"Analysing [blue]{repos.Count}[/] apps").LeftJustified());

        RepoAnalysis[]? results = null;
        await AnsiConsole
            .Progress()
            .Columns(new TaskDescriptionColumn(), new ProgressBarColumn(), new ElapsedTimeColumn(), new SpinnerColumn())
            .HideCompleted(true)
            .AutoClear(true)
            .StartAsync(async ctx =>
            {
                results = await Task.Run(() => AnalyzeRepos(ctx, repos, cancellationToken), cancellationToken);
            });

        Debug.Assert(results is not null);
        AnsiConsole.MarkupLine($"[green]Successfully[/] analyzed [blue]{results.Length}[/] apps");

        // Ample opportunity for SIMD belowow...
        var invalidProjects = results.Count(r => r.ValidProject is false);
        var failedBuilds = results.Count(r => r.Builds is false);
        var noAppLib = results.Count(r => r.HasAppLib is false);
        var oldAppLib = results.Count(r => r.HasLatestAppLib is false);
        var aOkay = results.Count(r => r.OK);

        AnsiConsole.WriteLine();
        AnsiConsole.Write(
            new BarChart()
                .Width(60)
                .Label("[green bold underline]Analysis[/]")
                .LeftAlignLabel()
                .AddItem("Invalid project", invalidProjects, Color.Red)
                .AddItem("Failed builds", failedBuilds, Color.Red)
                .AddItem("Missing Altinn.App.Core", noAppLib, Color.Red)
                .AddItem("Old Altinn.App.Core", oldAppLib, Color.Yellow)
                .AddItem("On Altinn.App.Core v8", aOkay, Color.Green)
        );
    }

    private List<Repo> GetRepos(CancellationToken cancellationToken)
    {
        Debug.Assert(_directory is not null);

        var result = new List<Repo>(64);
        var orgsCounter = 0;
        foreach (var orgDir in Directory.EnumerateDirectories(_directory.FullName))
        {
            var org = orgDir.Substring(orgDir.LastIndexOf(Path.DirectorySeparatorChar) + 1);
            cancellationToken.ThrowIfCancellationRequested();

            var reposCounter = 0;
            foreach (var repoDir in Directory.EnumerateDirectories(orgDir))
            {
                var name = repoDir.Substring(repoDir.LastIndexOf(Path.DirectorySeparatorChar) + 1);
                var repoDirInfo = new DirectoryInfo(Path.Combine(repoDir, Constants.MainBranchFolder));
                if (!repoDirInfo.Exists)
                {
                    AnsiConsole.MarkupLine($"Couldn't find main branch folder for repo: '{repoDirInfo.Name}'");
                    continue;
                }
                result.Add(new Repo(repoDirInfo, org, name));
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

    private RepoAnalysis[] AnalyzeRepos(ProgressContext ctx, List<Repo> repos, CancellationToken cancellationToken)
    {
        var options = new ParallelOptions
        {
            CancellationToken = cancellationToken,
            MaxDegreeOfParallelism = _parallelism,
        };

        var results = new ConcurrentBag<RepoAnalysis>();

        Parallel.ForEach(
            repos,
            options,
            repo =>
            {
                var (dir, org, name) = repo;
                var task = ctx.AddTask($"[green]{org}/{name}[/]", autoStart: false, maxValue: 1);
                task.IsIndeterminate = true;
                task.StartTask();

                var manager = new AnalyzerManager();
                var projectFile = Path.Combine(dir.FullName, "App", "App.csproj");

                void Exit(in RepoAnalysis result)
                {
                    results.Add(result);
                    task.Increment(1.0);
                    task.StopTask();
                }

                if (!File.Exists(projectFile))
                {
                    Exit(new RepoAnalysis(repo, validProject: false));
                    return;
                }

                const string Tfm = "net8.0";
                IAnalyzerResults buildResults;
                try
                {
                    var project = manager.GetProject(projectFile);
                    cancellationToken.ThrowIfCancellationRequested();

                    buildResults = project.Build(Tfm);
                    cancellationToken.ThrowIfCancellationRequested();
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    Exit(new RepoAnalysis(repo, validProject: false));
                    return;
                }

                if (!buildResults.TryGetTargetFramework(Tfm, out var result))
                {
                    Exit(new RepoAnalysis(repo, validProject: false));
                    return;
                }

                if (!result.Succeeded)
                {
                    Exit(new RepoAnalysis(repo, validProject: true, builds: false));
                    return;
                }

                var appCoreRef = result.PackageReferences.FirstOrDefault(r => r.Key == "Altinn.App.Core");
                if (appCoreRef.Key is null)
                {
                    Exit(new RepoAnalysis(repo, validProject: true, builds: true, hasAppLib: false));
                    return;
                }

                if (!appCoreRef.Value.TryGetValue("Version", out var version))
                {
                    Exit(new RepoAnalysis(repo, validProject: true, builds: true, hasAppLib: false));
                    return;
                }

                if (!version.StartsWith('8'))
                {
                    Exit(
                        new RepoAnalysis(
                            repo,
                            validProject: true,
                            builds: true,
                            hasAppLib: true,
                            HasLatestAppLib: false
                        )
                    );
                    return;
                }

                // AnsiConsole.MarkupLine($"Analyzing project: '{org}/{name}'");
                Exit(new RepoAnalysis(repo, validProject: true, builds: true, hasAppLib: true, HasLatestAppLib: true));
            }
        );

        return results.ToArray();
    }

    private sealed record Repo(DirectoryInfo Dir, string Org, string Name);

    // TODO: Consider SoA if this approach works OK
    private readonly record struct RepoAnalysis
    {
        private static readonly BitVector32.Section _validProject = BitVector32.CreateSection(2);
        private static readonly BitVector32.Section _builds = BitVector32.CreateSection(2, _validProject);
        private static readonly BitVector32.Section _hasAppLib = BitVector32.CreateSection(2, _builds);
        private static readonly BitVector32.Section _hasLatestAppLib = BitVector32.CreateSection(2, _hasAppLib);

        private readonly BitVector32 _bits;

        public RepoAnalysis(
            Repo repo,
            bool? validProject = null,
            bool? builds = null,
            bool? hasAppLib = null,
            bool? HasLatestAppLib = null
        )
        {
            Repo = repo;
            _bits = new BitVector32(0);
            _bits[_validProject] = ToValue(validProject);
            _bits[_builds] = ToValue(builds);
            _bits[_hasAppLib] = ToValue(hasAppLib);
            _bits[_hasLatestAppLib] = ToValue(HasLatestAppLib);
        }

        public readonly Repo Repo;

        public readonly bool? ValidProject => FromValue(_validProject);
        public readonly bool? Builds => FromValue(_builds);
        public readonly bool? HasAppLib => FromValue(_hasAppLib);
        public readonly bool? HasLatestAppLib => FromValue(_hasLatestAppLib);

        public bool OK => (_bits[_validProject] & _bits[_builds] & _bits[_hasAppLib] & _bits[_hasLatestAppLib]) == 1;

        private static int ToValue(bool? value) =>
            value switch
            {
                null => 2,
                false => 0,
                true => 1,
            };

        private bool? FromValue(BitVector32.Section section) =>
            _bits[section] switch
            {
                2 => default(bool?),
                0 => false,
                1 => true,
                var u => throw new Exception($"Unexpected value: {u}"),
            };
    }
}
