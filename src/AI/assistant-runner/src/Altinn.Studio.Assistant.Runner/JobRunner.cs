using System.Diagnostics;
using System.Text;

namespace Altinn.Studio.Assistant.Runner;

/// <summary>
/// Runs a command on a copy of an app, as the job user, in a new folder under /work. The job
/// folder holds the app and the HOME, TMPDIR, NuGet cache and studioctl home of the job, so a job
/// cannot change what the next job runs. Root makes the job folder, gives it to the job user and
/// removes it when it is empty. The job user does all other work in it.
/// </summary>
internal sealed class JobRunner : IJobRunner
{
    public const int MaxStreamBytes = 1024 * 1024;
    public const int MaxReportBytes = 8 * 1024 * 1024;
    public const int MaxPatchBytes = 20 * 1024 * 1024;

    /// <summary>
    /// The processes and threads of the job user. An upgrade uses fewer than 100. The limit stops a
    /// fork bomb before the service cannot start a process to stop it. The job cannot raise it.
    /// </summary>
    public const int MaxJobTasks = 1024;

    private const string WorkFolder = "/work";
    private const string SharedTempFolder = "/tmp";
    private const string AppFolderName = "app";

    /// <summary>
    /// The base commit is where the patch starts, and studioctl needs a clean working tree.
    /// studioctl writes to its home before it checks the tree, so the home is outside the app.
    /// </summary>
    private const string PrepareScript = """
        set -eu
        mkdir app home tmp studioctl studioctl/bin
        ln -s /opt/studioctl/bin/studioctl-server studioctl/bin/studioctl-server
        tar -xzf - --no-same-owner -C app
        cd app
        git init --quiet
        git add -A
        git commit --quiet --no-verify --allow-empty --message base
        """;

    /// <summary>
    /// A job can take away its own rights to its files, so the clean-up gives them back first.
    /// </summary>
    private const string CleanUpScript = """
        set -u
        for folder in "$1" /tmp /dev/shm; do
            [ -d "$folder" ] || continue
            find "$folder" -mindepth 1 -maxdepth 1 -user "$(id -u)" -exec chmod -R u+rwX -- {} +
            find "$folder" -mindepth 1 -maxdepth 1 -user "$(id -u)" -exec rm -rf -- {} +
        done
        """;

    private static readonly TimeSpan _folderStepTimeout = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan _gitTimeout = TimeSpan.FromMinutes(1);

    /// <summary>studioctl stops an upgrade after 10 minutes, so this limit only stops a studioctl that hangs.</summary>
    private static readonly TimeSpan _upgradeTimeout = TimeSpan.FromMinutes(11);
    private static readonly TimeSpan _buildTimeout = TimeSpan.FromMinutes(5);

    private static readonly string[] _upgradeCommand = ["studioctl", "app", "upgrade", "v9", "-p", ".", "--json"];
    private static readonly string[] _buildCommand =
    [
        "dotnet",
        "build",
        "App/App.csproj",
        "-nologo",
        "-v:q",
        "--disable-build-servers",
    ];

    private readonly JobUser _user;
    private readonly ILogger<JobRunner> _logger;

    public JobRunner(JobUser user, ILogger<JobRunner> logger)
    {
        _user = user;
        _logger = logger;
    }

    /// <summary>
    /// Only root can make a folder in /work. The .NET CLI keeps its named mutexes in /tmp, also
    /// with another TMPDIR, so jobs can write there, but only remove their own files.
    /// </summary>
    public static void PrepareSharedFolders()
    {
        File.SetUnixFileMode(
            WorkFolder,
            UnixFileMode.UserRead
                | UnixFileMode.UserWrite
                | UnixFileMode.UserExecute
                | UnixFileMode.GroupExecute
                | UnixFileMode.OtherExecute
        );
        File.SetUnixFileMode(
            SharedTempFolder,
            UnixFileMode.StickyBit
                | UnixFileMode.UserRead
                | UnixFileMode.UserWrite
                | UnixFileMode.UserExecute
                | UnixFileMode.GroupRead
                | UnixFileMode.GroupWrite
                | UnixFileMode.GroupExecute
                | UnixFileMode.OtherRead
                | UnixFileMode.OtherWrite
                | UnixFileMode.OtherExecute
        );
    }

    public async Task<JobOutcome> RunAsync(JobCommand command, Stream archive, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        await _user.StopProcessesAsync();
        var jobFolder = Path.Join(WorkFolder, Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(jobFolder, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
        try
        {
            await GiveToJobUserAsync(jobFolder);
            var prepareError = await PrepareAppAsync(jobFolder, archive, cancellationToken);
            if (prepareError is not null)
            {
                return new InvalidArchive(prepareError);
            }

            var result = command switch
            {
                JobCommand.UpgradeToV9 => await UpgradeAsync(jobFolder, cancellationToken),
                JobCommand.Build => await BuildAsync(jobFolder, cancellationToken),
                _ => throw new ArgumentOutOfRangeException(nameof(command), command, null),
            };
            _logger.LogInformation(
                "Job {Command} ended with exit code {ExitCode} after {Duration}. Timed out: {TimedOut}.",
                command,
                result.ExitCode,
                stopwatch.Elapsed,
                result.TimedOut
            );
            return result;
        }
        finally
        {
            await CleanUpAsync(jobFolder);
        }
    }

    internal static Dictionary<string, string> CreateEnvironment(string jobFolder)
    {
        var home = Path.Join(jobFolder, "home");
        return new Dictionary<string, string>
        {
            ["PATH"] = JobUser.SearchPath,
            ["HOME"] = home,
            ["TMPDIR"] = Path.Join(jobFolder, "tmp"),
            ["NUGET_PACKAGES"] = Path.Join(home, ".nuget", "packages"),
            ["STUDIOCTL_HOME"] = Path.Join(jobFolder, "studioctl"),
            ["STUDIOCTL_NO_UPDATE_CHECK"] = "1",
            ["NO_COLOR"] = "1",
            ["DOTNET_CLI_TELEMETRY_OPTOUT"] = "1",
            ["DOTNET_NOLOGO"] = "1",
            ["DOTNET_GENERATE_ASPNET_CERTIFICATE"] = "false",
            ["DOTNET_SKIP_WORKLOAD_INTEGRITY_CHECK"] = "1",
            ["NUGET_XMLDOC_MODE"] = "skip",
            ["MSBUILDDISABLENODEREUSE"] = "1",
            ["GIT_CONFIG_NOSYSTEM"] = "1",
            ["GIT_AUTHOR_NAME"] = "Assistant runner",
            ["GIT_AUTHOR_EMAIL"] = "assistant-runner@altinn.studio",
            ["GIT_COMMITTER_NAME"] = "Assistant runner",
            ["GIT_COMMITTER_EMAIL"] = "assistant-runner@altinn.studio",
        };
    }

    /// <summary>
    /// Cuts the output at <paramref name="maxBytes"/>, and keeps the read going, so that the
    /// process does not stop on a full pipe.
    /// </summary>
    internal static async Task<CutOutput> ReadAtMostAsync(Stream stream, int maxBytes)
    {
        using var kept = new MemoryStream();
        var buffer = new byte[81920];
        var isCut = false;
        int count;
        while ((count = await stream.ReadAsync(buffer, CancellationToken.None)) > 0)
        {
            var room = maxBytes - (int)kept.Length;
            isCut |= count > room;
            await kept.WriteAsync(buffer.AsMemory(0, Math.Clamp(count, 0, room)), CancellationToken.None);
        }

        return new CutOutput(kept.ToArray(), isCut);
    }

    /// <summary>The paths in the output are relative to the app, as they are for the client.</summary>
    internal static string ToAppText(CutOutput output, string jobFolder)
    {
        var text = Encoding
            .UTF8.GetString(output.Bytes)
            .Replace(AppFolder(jobFolder) + "/", "", StringComparison.Ordinal);
        return output.IsCut ? text + "\n[The runner cut this output here.]" : text;
    }

    private static string AppFolder(string jobFolder) => Path.Join(jobFolder, AppFolderName);

    private async Task<JobResult> UpgradeAsync(string jobFolder, CancellationToken cancellationToken)
    {
        var upgrade = await RunAsJobUserAsync(
            _upgradeCommand,
            jobFolder,
            AppFolder(jobFolder),
            _upgradeTimeout,
            cancellationToken,
            maxStdoutBytes: MaxReportBytes
        );
        if (upgrade.TimedOut)
        {
            return ToJobResult(upgrade, jobFolder, patch: null);
        }

        // The patch also holds the changes that studioctl did not stage.
        await RunGitAsync(["git", "add", "-A"], jobFolder, MaxStreamBytes, cancellationToken);
        var patch = await RunGitAsync(
            ["git", "diff", "--cached", "--binary"],
            jobFolder,
            MaxPatchBytes,
            cancellationToken
        );
        if (patch.IsCut)
        {
            throw new InvalidOperationException($"The patch is larger than {MaxPatchBytes} bytes.");
        }

        return ToJobResult(upgrade, jobFolder, patch.Bytes);
    }

    private async Task<JobResult> BuildAsync(string jobFolder, CancellationToken cancellationToken)
    {
        var build = await RunAsJobUserAsync(
            _buildCommand,
            jobFolder,
            AppFolder(jobFolder),
            _buildTimeout,
            cancellationToken
        );
        return ToJobResult(build, jobFolder, patch: null);
    }

    private static JobResult ToJobResult(ProcessResult result, string jobFolder, byte[]? patch) =>
        new(
            result.ExitCode,
            result.TimedOut,
            ToAppText(result.Stdout, jobFolder),
            ToAppText(result.Stderr, jobFolder),
            patch
        );

    private async Task<CutOutput> RunGitAsync(
        string[] command,
        string jobFolder,
        int maxStdoutBytes,
        CancellationToken cancellationToken
    )
    {
        var git = await RunAsJobUserAsync(
            command,
            jobFolder,
            AppFolder(jobFolder),
            _gitTimeout,
            cancellationToken,
            maxStdoutBytes: maxStdoutBytes
        );
        if (git.ExitCode != 0)
        {
            throw new InvalidOperationException(
                $"{string.Join(' ', command)} failed: {ToAppText(git.Stderr, jobFolder)}"
            );
        }

        return git.Stdout;
    }

    private async Task GiveToJobUserAsync(string jobFolder)
    {
        using var chown = Process.Start("chown", [$"{_user.Uid}:{_user.Gid}", jobFolder]);
        await chown.WaitForExitAsync(CancellationToken.None);
        if (chown.ExitCode != 0)
        {
            throw new InvalidOperationException($"Could not give {jobFolder} to {JobUser.Name}.");
        }
    }

    /// <summary>Returns why the app could not be prepared, or null.</summary>
    private async Task<string?> PrepareAppAsync(string jobFolder, Stream archive, CancellationToken cancellationToken)
    {
        var prepare = await RunAsJobUserAsync(
            ["sh", "-c", PrepareScript],
            jobFolder,
            jobFolder,
            _folderStepTimeout,
            cancellationToken,
            input: archive
        );
        return prepare.ExitCode == 0
            ? null
            : $"The runner could not extract and commit the app: {ToAppText(prepare.Stderr, jobFolder)}";
    }

    private async Task CleanUpAsync(string jobFolder)
    {
        await _user.StopProcessesAsync();
        var cleanUp = await RunAsJobUserAsync(
            ["sh", "-c", CleanUpScript, "sh", jobFolder],
            jobFolder,
            "/",
            _folderStepTimeout,
            CancellationToken.None
        );
        if (cleanUp.ExitCode != 0)
        {
            _logger.LogWarning(
                "The clean-up of {JobFolder} failed: {Stderr}",
                jobFolder,
                ToAppText(cleanUp.Stderr, jobFolder)
            );
        }

        Directory.Delete(jobFolder);
    }

    /// <summary>
    /// After the command, also after a timeout or an abort, the job user stops all its processes.
    /// A process that the command left can keep the output pipes open, and can change the files
    /// that the next step reads.
    /// </summary>
    private async Task<ProcessResult> RunAsJobUserAsync(
        IEnumerable<string> command,
        string jobFolder,
        string directory,
        TimeSpan timeout,
        CancellationToken cancellationToken,
        Stream? input = null,
        int maxStdoutBytes = MaxStreamBytes
    )
    {
        using var timeoutSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutSource.CancelAfter(timeout);
        using var process = new Process
        {
            StartInfo = _user.CreateStartInfo(
                ["prlimit", $"--nproc={MaxJobTasks}", "--", .. command],
                directory,
                CreateEnvironment(jobFolder)
            ),
        };
        process.Start();
        var stdout = ReadAtMostAsync(process.StandardOutput.BaseStream, maxStdoutBytes);
        var stderr = ReadAtMostAsync(process.StandardError.BaseStream, MaxStreamBytes);
        var writing = WriteInputAsync(process.StandardInput.BaseStream, input);
        var timedOut = false;
        try
        {
            await process.WaitForExitAsync(timeoutSource.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            timedOut = true;
        }
        finally
        {
            await _user.StopProcessesAsync();
            await process.WaitForExitAsync(CancellationToken.None);
            await writing;
        }

        return new ProcessResult(timedOut ? null : process.ExitCode, timedOut, await stdout, await stderr);
    }

    /// <summary>The exit code of the command tells why it did not read all of the input.</summary>
    private static async Task WriteInputAsync(Stream standardInput, Stream? input)
    {
        try
        {
            if (input is not null)
            {
                await input.CopyToAsync(standardInput, CancellationToken.None);
            }

            standardInput.Close();
        }
        catch (IOException)
        {
            // The command stopped before it read all of the input.
        }
    }

    internal sealed record CutOutput(byte[] Bytes, bool IsCut);

    private sealed record ProcessResult(int? ExitCode, bool TimedOut, CutOutput Stdout, CutOutput Stderr);
}
