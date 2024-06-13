using System.Globalization;
using Altinn.Analysis;
using ConsoleAppFramework;

var app = ConsoleApp.Create();
app.Add<Commands>();
await app.RunAsync(args);

public class Commands
{
    /// <summary>Fetch Altinn apps into a local directory</summary>
    /// <param name="username">-u, username for Altinn Studio.</param>
    /// <param name="password">-p, password for Altinn Studio.</param>
    /// <param name="directory">-d, local directory to place fetched apps.</param>
    /// <param name="clearDirectory">-cd, clear directory before fetching.</param>
    /// <param name="maxParallelism">-mp, make parallelism for running analysis (including fetching data).</param>
    /// <param name="altinnUrl">-au, URL for Altinn Studio APIs.</param>
    /// <param name="configFile">-c, Config file for this CLI.</param>
    [Command("fetch")]
    public async Task Fetch(
        string? username = null,
        string? password = null,
        string? directory = null,
        bool? clearDirectory = null,
        int? maxParallelism = null,
        string? altinnUrl = null,
        string? configFile = null,
        CancellationToken cancellationToken = default
    )
    {
        var config = await TryReadConfigFile(configFile, cancellationToken);
        var analyzer = new AppsFetcher(
            new(
                directory ?? config.Directory ?? "repos/",
                username ?? config.Username ?? throw new Exception("Need username config to fetch"),
                password ?? config.Password ?? throw new Exception("Need password config to fetch"),
                maxParallelism ?? config.MaxParallelism ?? Environment.ProcessorCount,
                clearDirectory ?? config.ClearDirectory ?? false,
                altinnUrl ?? config.AltinnUrl ?? "https://altinn.studio"
            )
        );
        await analyzer.Fetch(cancellationToken);
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
        var config = await TryReadConfigFile(configFile, cancellationToken);
        var analyzer = new AppsAnalyzer(
            new(
                directory ?? config.Directory ?? "repos/",
                maxParallelism ?? config.MaxParallelism ?? Environment.ProcessorCount
            )
        );
        await analyzer.Analyze(cancellationToken);
    }

    private async Task<ConfigFile> TryReadConfigFile(string? configFile, CancellationToken cancellationToken)
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
                case "username":
                    result = result with { Username = value };
                    break;
                case "password":
                    result = result with { Password = value };
                    break;
                case "clear_directory":
                    if (!bool.TryParse(value, out var clearDirectory))
                        throw new Exception($"Unexpected value for 'clear_directory': '{value}' - expected boolean");
                    result = result with { ClearDirectory = clearDirectory };
                    break;
                case "max_parallelism":
                    if (!int.TryParse(value, CultureInfo.InvariantCulture, out var maxParallelism))
                        throw new Exception($"Unexpected value for 'max_parallelism': '{value}' - expected integer");
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

    private readonly record struct ConfigFile
    {
        public string? Directory { get; init; }
        public string? Username { get; init; }
        public string? Password { get; init; }
        public bool? ClearDirectory { get; init; }
        public int? MaxParallelism { get; init; }
        public string? AltinnUrl { get; init; }
    }
}
