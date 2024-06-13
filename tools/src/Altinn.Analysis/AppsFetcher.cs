using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Threading.Channels;
using Spectre.Console;

namespace Altinn.Analysis;

public sealed record FetchConfig(
    string Directory,
    string Username,
    string Password,
    int MaxParallelism,
    bool ClearDirectory,
    string AltinnUrl
);

public sealed class AppsFetcher
{
    private readonly FetchConfig _config;
    private readonly GiteaClient _giteaClient;

    private DirectoryInfo? _directory;
    private int _parallelism;

    public AppsFetcher(FetchConfig config)
    {
        _config = config;
        _giteaClient = new GiteaClient(config);
    }

    private bool VerifyConfig()
    {
        var table = new Table();
        table.Border(TableBorder.None);
        table.AddColumn(new TableColumn(""));
        table.AddColumn(new TableColumn(""));

        _parallelism = Math.Min(Constants.LimitMaxParallelism, _config.MaxParallelism);
        var clearDirectory = _config.ClearDirectory;
        var clearDirectoryConf = clearDirectory.ToString(CultureInfo.InvariantCulture).ToLowerInvariant();
        table.AddRow(new Markup(nameof(FetchConfig.Directory)), new Markup($"= [bold]{_config.Directory}[/]"));
        table.AddRow(new Markup(nameof(FetchConfig.Username)), new Markup($"= [bold]{_config.Username}[/]"));
        table.AddRow(
            new Markup(nameof(FetchConfig.Password)),
            new Markup($"= [bold]{_config.Password[..2]}**********[/]")
        );
        table.AddRow(new Markup(nameof(FetchConfig.ClearDirectory)), new Markup($"= [bold]{clearDirectoryConf}[/]"));
        table.AddRow(new Markup("Parallelism"), new Markup($"= [bold]{_parallelism}[/]"));
        table.AddRow(new Markup(nameof(FetchConfig.AltinnUrl)), new Markup($"= [bold]{_config.AltinnUrl}[/]"));
        AnsiConsole.Write(table);
        AnsiConsole.WriteLine();

        if (!Debugger.IsAttached)
        {
            var proceed = AnsiConsole.Prompt(new ConfirmationPrompt($"Continue?"));
            return proceed;
        }

        return true;
    }

    private void PrepareDirectory()
    {
        _directory = new DirectoryInfo(_config.Directory);

        if (_config.ClearDirectory && _directory.Exists)
        {
            AnsiConsole.MarkupLine("Clearing directory...");
            _directory.Delete(recursive: true);
        }

        if (!_directory.Exists)
            _directory = Directory.CreateDirectory(_config.Directory);
    }

    public async Task Fetch(CancellationToken cancellationToken)
    {
        AnsiConsole.MarkupLine("[blue]Fetching Altinn apps[/]... Config:");
        if (!VerifyConfig())
            return;

        PrepareDirectory();

        var apps = await GetApps(cancellationToken);

        AnsiConsole.WriteLine();
        if (!Debugger.IsAttached)
        {
            var proceed = AnsiConsole.Prompt(new ConfirmationPrompt($"Continue to download apps locally?"));
            if (!proceed)
                return;
        }

        await DownloadApps(apps, cancellationToken);
    }

    private async Task<GetAppsResult> GetApps(CancellationToken cancellationToken)
    {
        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Rule("Finding organizations and apps").LeftJustified());
        GetAppsResult? result = null;
        await AnsiConsole
            .Progress()
            .Columns(
                new TaskDescriptionColumn(),
                new ProgressBarColumn(),
                new ValueProgressColumn(),
                new ElapsedTimeColumn(),
                new SpinnerColumn()
            )
            .HideCompleted(true)
            .AutoClear(true)
            .StartAsync(async ctx =>
            {
                result = await GetApps(ctx, cancellationToken);
            });
        Debug.Assert(result is not null);
        var (orgs, repos, _) = result;
        AnsiConsole.MarkupLine(
            $"Fetched organizations and apps from Altinn Studio - [green]{orgs.Count} organizations[/], [blue]{repos.Count} apps[/]"
        );
        return result;
    }

    private async Task<GetAppsResult> GetApps(ProgressContext ctx, CancellationToken cancellationToken)
    {
        AnsiConsole.MarkupLine($"Fetching organizations and apps from Altinn Studio Gitea");

        ConcurrentDictionary<GiteaOrg, List<GiteaRepo>> reposByOrg = new();

        var options = new ParallelOptions
        {
            CancellationToken = cancellationToken,
            MaxDegreeOfParallelism = _parallelism,
        };
        await Parallel.ForEachAsync(
            _giteaClient.GetOrgs(cancellationToken),
            options,
            async (org, canncellationToken) =>
            {
                var task = ctx.AddTask($"[green]{org.FullName} ({org.Name})[/]", autoStart: false);

                task.IsIndeterminate = true;
                task.StartTask();

                var repos = reposByOrg.GetOrAdd(org, _ => new List<GiteaRepo>(4));

                await foreach (var repo in _giteaClient.GetRepos(org.Name, cancellationToken))
                {
                    repos.Add(repo);
                    var maxValue = task.MaxValue;
                    if (repos.Count >= maxValue)
                        task.MaxValue = maxValue + 25;
                    task.Increment(1);
                }
                task.MaxValue = repos.Count;

                ctx.Refresh();
                task.StopTask();
            }
        );

        return new GetAppsResult(
            reposByOrg.Keys.ToArray(),
            reposByOrg.SelectMany(kvp => kvp.Value).ToArray(),
            reposByOrg.ToDictionary(kvp => kvp.Key, kvp => (IReadOnlyList<GiteaRepo>)kvp.Value)
        );
    }

    private async Task<DownloadAppsResult> DownloadApps(GetAppsResult apps, CancellationToken cancellationToken)
    {
        var (orgs, repos, _) = apps;
        AnsiConsole.WriteLine();
        AnsiConsole.Write(new Rule($"Downloading apps").LeftJustified());

        DownloadAppsResult? result = null;
        await AnsiConsole
            .Progress()
            .Columns(
                new TaskDescriptionColumn(),
                new ProgressBarColumn(),
                new ValueProgressColumn(),
                new PercentageColumn(),
                new ElapsedTimeColumn(),
                new SpinnerColumn()
            )
            .HideCompleted(true)
            .AutoClear(true)
            .StartAsync(async ctx =>
            {
                result = await DownloadApps(ctx, apps, cancellationToken);
            });

        Debug.Assert(result is not null);

        AnsiConsole.MarkupLine($"[green]Successfully[/] fetched [blue]{result.Repos.Count}[/] apps");

        return result;
    }

    private async Task<DownloadAppsResult> DownloadApps(
        ProgressContext ctx,
        GetAppsResult basicInformation,
        CancellationToken cancellationToken
    )
    {
        Debug.Assert(_directory is not null);

        var queue = Channel.CreateBounded<(
            GiteaOrg Org,
            GiteaRepo Repo,
            ProgressTask Task,
            DirectoryInfo OrgDirectory
        )>(new BoundedChannelOptions(_parallelism * 2) { SingleWriter = true, SingleReader = false });

        var results = new ConcurrentBag<RepoInfo>();

        var processors = new Task[_parallelism];
        for (int i = 0; i < _parallelism; i++)
        {
            processors[i] = Task.Run(
                async () =>
                {
                    var reader = queue.Reader;
                    while (await reader.WaitToReadAsync(cancellationToken))
                    {
                        while (reader.TryRead(out var entry))
                        {
                            var (org, repo, task, orgDirectory) = entry;
                            var branch = repo.DefaultBranch;
                            if (string.IsNullOrWhiteSpace(branch))
                                throw new Exception($"Default branch not set for repo: '{repo.FullName}'");

                            var repoDirectory = orgDirectory.CreateSubdirectory(repo.Name);
                            var branchDirectory = repoDirectory.CreateSubdirectory(Constants.MainBranchFolder);
                            await _giteaClient.DownloadRepoArchive(
                                org,
                                repo,
                                branchDirectory,
                                branch,
                                cancellationToken: cancellationToken
                            );

                            results.Add(new(org, repo, branch, branchDirectory));

                            task.Increment(1);

                            if (task.IsFinished)
                                task.StopTask();
                        }
                    }
                },
                cancellationToken
            );
        }

        var options = new ParallelOptions
        {
            CancellationToken = cancellationToken,
            MaxDegreeOfParallelism = _parallelism,
        };
        await Parallel.ForEachAsync(
            basicInformation.Orgs,
            options,
            async (org, cancellationToken) =>
            {
                var repos = basicInformation.ReposByOrg[org];
                var task = ctx.AddTask(
                    $"[green]{org.FullName} ({org.Name})[/]",
                    autoStart: true,
                    maxValue: repos.Count
                );
                var orgDirectory = _directory.CreateSubdirectory(org.Name);
                foreach (var repo in repos)
                {
                    await queue.Writer.WriteAsync((org, repo, task, orgDirectory), cancellationToken);
                }
            }
        );

        queue.Writer.Complete();

        await Task.WhenAll(processors);

        return new DownloadAppsResult(results.ToArray());
    }

    private sealed record GetAppsResult(
        IReadOnlyList<GiteaOrg> Orgs,
        IReadOnlyList<GiteaRepo> Repos,
        IReadOnlyDictionary<GiteaOrg, IReadOnlyList<GiteaRepo>> ReposByOrg
    );

    private sealed record DownloadAppsResult(IReadOnlyList<RepoInfo> Repos);

    private sealed record RepoInfo(GiteaOrg Org, GiteaRepo Repo, string Branch, DirectoryInfo MainDir);
}
