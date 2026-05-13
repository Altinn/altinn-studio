using System.Diagnostics;
using System.Globalization;
using Altinn.Analysis;
using ConsoleAppFramework;
using Spectre.Console;

var app = ConsoleApp.Create();
app.Add<Commands>();
await app.RunAsync(args);

public class Commands
{
#pragma warning disable CA1822 // Mark members as static

    private static readonly string DefaultAltinnUrl = new UriBuilder(
        Uri.UriSchemeHttps,
        "altinn.studio"
    ).Uri.GetLeftPart(UriPartial.Authority);

    /// <summary>Fetch Altinn apps into a local directory</summary>
    /// <param name="directory">-d, local directory to place fetched apps.</param>
    /// <param name="clearDirectory">-cd, clear directory before fetching.</param>
    /// <param name="maxParallelism">-mp, make parallelism for running analysis (including fetching data).</param>
    /// <param name="altinnUrl">-au, URL for Altinn Studio APIs.</param>
    /// <param name="configFile">-c, Config file for this CLI.</param>
    [Command("fetch")]
    public async Task Fetch(
        string? directory = null,
        bool? clearDirectory = null,
        int? maxParallelism = null,
        string? altinnUrl = null,
        string? configFile = null,
        CancellationToken cancellationToken = default
    )
    {
        var timer = Stopwatch.StartNew();
        var config = await TryReadConfigFile(configFile, cancellationToken);
        var effectiveAltinnUrl = altinnUrl ?? config.AltinnUrl ?? DefaultAltinnUrl;
        var gitCredentials = await GetGitCredentials(effectiveAltinnUrl, cancellationToken);
        using var analyzer = new AppsFetcher(
            new(
                directory ?? config.Directory ?? "repos/",
                gitCredentials.Username,
                gitCredentials.Password,
                maxParallelism ?? config.MaxParallelism ?? Environment.ProcessorCount,
                clearDirectory ?? config.ClearDirectory ?? false,
                effectiveAltinnUrl
            )
        );
        await analyzer.Fetch(cancellationToken);
        timer.Stop();
        var elapsed = timer.Elapsed switch
        {
            var v when v >= TimeSpan.FromHours(1) => $"{v.TotalHours:0.00}h",
            var v when v >= TimeSpan.FromMinutes(1) => $"{v.TotalMinutes:0.00}m",
            var v => $"{v.TotalSeconds:0.00}s",
        };
        AnsiConsole.MarkupLine("");
        AnsiConsole.MarkupLine($"[green]Fetch completed in {elapsed}[/]");
    }

    /// <summary>Analyze Altinn apps in a directory</summary>
    /// <param name="directory">-d, local directory to place fetched apps.</param>
    /// <param name="maxParallelism">-mp, make parallelism for running analysis (including fetching data).</param>
    /// <param name="configFile">-c, Config file for this CLI.</param>
    [Command("analyze")]
    public async Task Analyze(
        string? directory = null,
        int? maxParallelism = null,
        string? configFile = null,
        CancellationToken cancellationToken = default
    )
    {
        var timer = Stopwatch.StartNew();
        var config = await TryReadConfigFile(configFile, cancellationToken);
        var analyzer = new AppsAnalyzer(
            new(
                directory ?? config.Directory ?? "repos/",
                maxParallelism ?? config.MaxParallelism ?? Environment.ProcessorCount
            )
        );
        await analyzer.Analyze(cancellationToken);
        timer.Stop();
        var elapsed = timer.Elapsed switch
        {
            var v when v >= TimeSpan.FromHours(1) => $"{v.TotalHours:0.00}h",
            var v when v >= TimeSpan.FromMinutes(1) => $"{v.TotalMinutes:0.00}m",
            var v => $"{v.TotalSeconds:0.00}s",
        };
        AnsiConsole.MarkupLine("");
        AnsiConsole.MarkupLine($"[green]Analysis completed in {elapsed}[/]");
    }

    private static async Task<ConfigFile> TryReadConfigFile(
        string? configFile,
        CancellationToken cancellationToken
    )
    {
        var result = new ConfigFile();

        if (string.IsNullOrWhiteSpace(configFile))
            return result;

        if (!File.Exists(configFile))
            throw new Exception($"Could not find config file at: '{configFile}'");

        var lines = await File.ReadAllLinesAsync(configFile, cancellationToken);
        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            if (line.Split('=') is not [var key, var value])
                throw new Exception($"Invalid config at line: {line}");

            switch (key)
            {
                case "directory":
                    result = result with { Directory = value };
                    break;
                case "clear_directory":
                    if (!bool.TryParse(value, out var clearDirectory))
                        throw new Exception(
                            $"Unexpected value for 'clear_directory': '{value}' - expected boolean"
                        );
                    result = result with { ClearDirectory = clearDirectory };
                    break;
                case "max_parallelism":
                    if (!int.TryParse(value, CultureInfo.InvariantCulture, out var maxParallelism))
                        throw new Exception(
                            $"Unexpected value for 'max_parallelism': '{value}' - expected integer"
                        );
                    result = result with { MaxParallelism = maxParallelism };
                    break;
                case "altinn_url":
                    result = result with { AltinnUrl = value };
                    break;
                default:
                    throw new Exception($"Unexpected key in config: '{key}'");
            }
        }

        return result;
    }

    private static async Task<GitCredentials> GetGitCredentials(
        string altinnUrl,
        CancellationToken cancellationToken
    )
    {
        if (!Uri.TryCreate(altinnUrl, UriKind.Absolute, out var uri))
            throw new Exception($"Invalid Altinn URL: '{altinnUrl}'");

        var host = uri.IsDefaultPort ? uri.Host : uri.Authority;
        if (string.IsNullOrWhiteSpace(uri.Scheme) || string.IsNullOrWhiteSpace(host))
            throw new Exception($"Invalid Altinn URL: '{altinnUrl}'");

        var startInfo = new ProcessStartInfo("studioctl")
        {
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        startInfo.ArgumentList.Add("auth");
        startInfo.ArgumentList.Add("git-credential");

        using var process =
            Process.Start(startInfo)
            ?? throw new Exception("Failed to start 'studioctl auth git-credential'");

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
        var request =
            $"protocol={uri.Scheme}\nhost={host}\npath=repos/apps-analysis/auth-check.git\n\n";

        await process.StandardInput.WriteAsync(request.AsMemory(), cancellationToken);
        process.StandardInput.Close();
        await process.WaitForExitAsync(cancellationToken);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;
        if (process.ExitCode != 0)
            throw new Exception($"studioctl auth git-credential failed: {stderr.Trim()}");

        var credentials = TryParseGitCredentials(stdout);
        if (credentials is null)
            throw new Exception(
                $"No credentials returned from 'studioctl auth git-credential' for {uri.Scheme}://{host}. Run 'studioctl auth login' first."
            );

        return credentials.Value;
    }

    private static GitCredentials? TryParseGitCredentials(string output)
    {
        string? username = null;
        string? password = null;
        foreach (var line in output.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries))
        {
            var separator = line.IndexOf('=');
            if (separator <= 0)
                continue;

            var key = line[..separator];
            var value = line[(separator + 1)..];
            switch (key)
            {
                case "username":
                    username = value;
                    break;
                case "password":
                    password = value;
                    break;
            }
        }

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return null;

        return new GitCredentials(username, password);
    }

    private readonly record struct ConfigFile
    {
        public string? Directory { get; init; }
        public bool? ClearDirectory { get; init; }
        public int? MaxParallelism { get; init; }
        public string? AltinnUrl { get; init; }
    }

    private readonly record struct GitCredentials(string Username, string Password);
}
