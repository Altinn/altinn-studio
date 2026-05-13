using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
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

public sealed class AppsFetcher : IDisposable
{
    private static readonly JsonSerializerOptions ManifestJsonSerializerOptions = new()
    {
        WriteIndented = true,
    };
    private static readonly byte[] NewLine = "\n"u8.ToArray();

    private readonly FetchConfig _config;
    private readonly GiteaClient _giteaClient;
    private readonly KubernetesWrapperClient _kubernetesWrapperClient;

    private DirectoryInfo? _directory;
    private int _parallelism;

    public AppsFetcher(FetchConfig config)
    {
        _config = config;
        _giteaClient = new GiteaClient(config);
        _kubernetesWrapperClient = new KubernetesWrapperClient();
    }

    private bool VerifyConfig()
    {
        var table = new Table();
        table.Border(TableBorder.None);
        table.AddColumn(new TableColumn(""));
        table.AddColumn(new TableColumn(""));

        _parallelism = Math.Min(Constants.LimitMaxParallelism, _config.MaxParallelism);
        var clearDirectory = _config.ClearDirectory;
        var clearDirectoryConf = clearDirectory
            .ToString(CultureInfo.InvariantCulture)
            .ToLowerInvariant();
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
        table.AddRow(
            new Markup(nameof(FetchConfig.Username)),
            new Markup($"= [bold]{_config.Username}[/]")
        );
        table.AddRow(
            new Markup(nameof(FetchConfig.Password)),
            new Markup($"= [bold]{_config.Password[..2]}**********[/]")
        );
        table.AddRow(
            new Markup(nameof(FetchConfig.ClearDirectory)),
            new Markup($"= [bold]{clearDirectoryConf}[/]")
        );
        table.AddRow(new Markup("Parallelism"), new Markup($"= [bold]{_parallelism}[/]"));
        table.AddRow(
            new Markup(nameof(FetchConfig.AltinnUrl)),
            new Markup($"= [bold]{_config.AltinnUrl}[/]")
        );
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
        var directory = Path.GetFullPath(
            _config.Directory.Replace(
                "~",
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
            )
        );
        _directory = new DirectoryInfo(directory);

        if (_config.ClearDirectory && _directory.Exists)
        {
            AnsiConsole.MarkupLine($"Clearing directory '{_directory.FullName}'...");
            _directory.Delete(recursive: true);
        }

        if (!_directory.Exists)
            _directory = Directory.CreateDirectory(directory);
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
            var proceed = await AnsiConsole.PromptAsync(
                new ConfirmationPrompt($"Continue to download apps locally?"),
                cancellationToken
            );
            if (!proceed)
                return;
        }

        var downloadResult = await DownloadApps(apps, cancellationToken);
        await WriteManifest(downloadResult, cancellationToken);
    }

    private sealed record OrgRecord(List<AppInfo> Apps)
    {
        public int Skipped { get; set; }
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
        // Debug.Assert(result is not null);
        // ! TODO
        var (orgs, repos, reposByOrg) = result!;
        var skippedTotal = reposByOrg.Sum(r => r.Value.Skipped);
        AnsiConsole.MarkupLine(
            $"Fetched organizations and apps from Altinn Studio - [green]{orgs.Count} organizations[/], [blue]{repos.Count} apps[/] (skipped {skippedTotal} undeployed apps)"
        );
        return result;
    }

    private async Task<GetAppsResult> GetApps(
        ProgressContext ctx,
        CancellationToken cancellationToken
    )
    {
        AnsiConsole.MarkupLine($"Fetching organizations and apps from Altinn Studio Gitea");

        ConcurrentDictionary<GiteaOrg, OrgRecord> reposByOrg = new();

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

                var deploymentstt02 = await _kubernetesWrapperClient.GetDeployments(
                    org.Name,
                    "tt02"
                );
                var deploymentsProd = await _kubernetesWrapperClient.GetDeployments(
                    org.Name,
                    "prod"
                );
                var tt02Deployments = deploymentstt02
                    .GroupBy(d => d.Repo)
                    .ToDictionary(g => g.Key, g => g.First());
                var prodDeployments = deploymentsProd
                    .GroupBy(d => d.Repo)
                    .ToDictionary(g => g.Key, g => g.First());

                HashSet<string> deployedApps = new(tt02Deployments.Keys);
                deployedApps.UnionWith(prodDeployments.Keys);

                task.MaxValue = Math.Max(deployedApps.Count, 1);

                var orgRecord = reposByOrg.GetOrAdd(org, _ => new(new List<AppInfo>(4)));

                await foreach (var repo in _giteaClient.GetRepos(org.Name, cancellationToken))
                {
                    if (deployedApps.Contains(repo.Name))
                    {
                        tt02Deployments.TryGetValue(repo.Name, out var tt02Deployment);
                        prodDeployments.TryGetValue(repo.Name, out var prodDeployment);
                        orgRecord.Apps.Add(new AppInfo(repo, tt02Deployment, prodDeployment));
                    }
                    else
                    {
                        orgRecord.Skipped += 1;
                    }
                    task.Increment(1);
                    if (task.Value >= task.MaxValue)
                        task.MaxValue = task.Value + 25;
                }
                task.MaxValue = task.Value;

                ctx.Refresh();
                task.StopTask();
            }
        );

        return new GetAppsResult(
            reposByOrg.Keys.ToArray(),
            reposByOrg.SelectMany(kvp => kvp.Value.Apps).ToArray(),
            reposByOrg.ToDictionary(
                kvp => kvp.Key,
                kvp => ((IReadOnlyList<AppInfo>)kvp.Value.Apps, kvp.Value.Skipped)
            )
        );
    }

    private async Task<DownloadAppsResult> DownloadApps(
        GetAppsResult apps,
        CancellationToken cancellationToken
    )
    {
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

        AnsiConsole.MarkupLine(
            $"[green]Successfully[/] fetched [blue]{result.Repos.Count}[/] apps"
        );

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
            AppInfo App,
            ProgressTask Task,
            DirectoryInfo OrgDirectory
        )>(
            new BoundedChannelOptions(_parallelism * 2)
            {
                SingleWriter = true,
                SingleReader = false,
            }
        );

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
                            var (org, app, task, orgDirectory) = entry;
                            var repo = app.Repo;
                            var branch = repo.DefaultBranch;
                            if (string.IsNullOrWhiteSpace(branch))
                                throw new Exception(
                                    $"Default branch not set for repo: '{repo.FullName}'"
                                );

                            var repoDirectory = orgDirectory.CreateSubdirectory(repo.Name);
                            var branchDirectory = repoDirectory.CreateSubdirectory(
                                Constants.MainBranchFolder
                            );

                            if (
                                branchDirectory.Exists
                                && new DirectoryInfo(
                                    Path.Join(branchDirectory.FullName, ".git")
                                ).Exists
                            )
                            {
                                await _giteaClient.UpdateRepo(
                                    repo,
                                    branchDirectory,
                                    cancellationToken
                                );
                            }
                            else
                            {
                                await _giteaClient.CloneRepo(
                                    repo,
                                    branchDirectory,
                                    branch,
                                    cancellationToken: cancellationToken
                                );
                            }

                            results.Add(new(org, app, branch, branchDirectory));

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
                var (apps, skipped) = basicInformation.AppsByOrg[org];
                var task = ctx.AddTask(
                    $"[green]{org.FullName} ({org.Name})[/] (skipped: {skipped})",
                    autoStart: true,
                    maxValue: apps.Count
                );
                var orgDirectory = _directory.CreateSubdirectory(org.Name);
                foreach (var app in apps)
                {
                    await queue.Writer.WriteAsync(
                        (org, app, task, orgDirectory),
                        cancellationToken
                    );
                }
            }
        );

        queue.Writer.Complete();

        await Task.WhenAll(processors);

        return new DownloadAppsResult(results.ToArray());
    }

    private async Task WriteManifest(
        DownloadAppsResult downloadResult,
        CancellationToken cancellationToken
    )
    {
        Debug.Assert(_directory is not null);

        var manifestPath = Path.Join(_directory.FullName, "manifest.json");
        var manifest = new FetchManifest(
            GeneratedAt: DateTimeOffset.UtcNow,
            AltinnUrl: _config.AltinnUrl,
            Apps: downloadResult
                .Repos.OrderBy(r => r.Org.Name, StringComparer.Ordinal)
                .ThenBy(r => r.App.Repo.Name, StringComparer.Ordinal)
                .Select(r => new FetchManifestApp(
                    Org: r.Org.Name,
                    Repo: r.App.Repo.Name,
                    FullName: r.App.Repo.FullName,
                    DefaultBranch: r.Branch,
                    LocalPath: Path.GetRelativePath(_directory.FullName, r.MainDir.FullName),
                    CloneUrl: r.App.Repo.CloneUrl,
                    DeployedToTt02: r.App.Tt02Deployment is not null,
                    Tt02Version: r.App.Tt02Deployment?.Version,
                    DeployedToProd: r.App.ProdDeployment is not null,
                    ProdVersion: r.App.ProdDeployment?.Version
                ))
                .ToArray()
        );

        await using var stream = File.Create(manifestPath);
        await JsonSerializer.SerializeAsync(
            stream,
            manifest,
            ManifestJsonSerializerOptions,
            cancellationToken
        );
        await stream.WriteAsync(NewLine, cancellationToken);

        AnsiConsole.MarkupLine($"Wrote manifest to [bold]{manifestPath}[/]");
    }

    public void Dispose()
    {
        _giteaClient.Dispose();
    }

    private sealed record GetAppsResult(
        IReadOnlyList<GiteaOrg> Orgs,
        IReadOnlyList<AppInfo> Apps,
        IReadOnlyDictionary<GiteaOrg, (IReadOnlyList<AppInfo> Apps, int Skipped)> AppsByOrg
    );

    private sealed record DownloadAppsResult(IReadOnlyList<RepoInfo> Repos);

    private sealed record AppInfo(
        GiteaRepo Repo,
        Deployment? Tt02Deployment,
        Deployment? ProdDeployment
    );

    private sealed record RepoInfo(GiteaOrg Org, AppInfo App, string Branch, DirectoryInfo MainDir);

    private sealed record FetchManifest(
        DateTimeOffset GeneratedAt,
        string AltinnUrl,
        IReadOnlyList<FetchManifestApp> Apps
    );

    private sealed record FetchManifestApp(
        string Org,
        string Repo,
        string FullName,
        string DefaultBranch,
        string LocalPath,
        string CloneUrl,
        bool DeployedToTt02,
        string? Tt02Version,
        bool DeployedToProd,
        string? ProdVersion
    );
}
