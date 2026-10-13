using System.Diagnostics;
using System.Globalization;

namespace Altinn.Studio.Assistant.Runner;

/// <summary>
/// The user that runs app code. MSBuild runs code that the app controls: <c>Exec</c> targets,
/// inline tasks, and the targets, analyzers and source generators of NuGet packages.
/// </summary>
internal sealed class JobUser
{
    public const string Name = "app-build";

    public const string SearchPath = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

    private const string PasswdFile = "/etc/passwd";
    private const int PasswdUidField = 2;
    private const int PasswdGidField = 3;

    private static readonly TimeSpan _processStopTimeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan _processStopPollInterval = TimeSpan.FromMilliseconds(50);

    /// <summary>A zombie has stopped and waits for its parent. A dead process is about to go.</summary>
    private static readonly char[] _stoppedProcessStates = ['Z', 'X'];

    public JobUser(int uid, int gid)
    {
        Uid = uid;
        Gid = gid;
    }

    public int Uid { get; }

    public int Gid { get; }

    /// <summary>
    /// Fails closed: without root, the service cannot start a job as another user, and the job
    /// would run with the rights of the service.
    /// </summary>
    public static JobUser Find()
    {
        if (!Environment.IsPrivilegedProcess)
        {
            throw new InvalidOperationException($"The runner must run as root to start jobs as {Name}.");
        }

        var fields = File.ReadLines(PasswdFile)
            .Select(line => line.Split(':'))
            .FirstOrDefault(fields => fields[0] == Name);
        if (fields is null)
        {
            throw new InvalidOperationException($"The user {Name} does not exist.");
        }

        var uid = int.Parse(fields[PasswdUidField], CultureInfo.InvariantCulture);
        if (uid == 0)
        {
            throw new InvalidOperationException($"The user {Name} must not be root.");
        }

        return new JobUser(uid, int.Parse(fields[PasswdGidField], CultureInfo.InvariantCulture));
    }

    /// <summary>
    /// The command gets only <paramref name="environment"/>, and starts in <paramref name="directory"/>.
    /// The service does not change to the directory itself, because the job user owns it, and the
    /// service has no capability to read the folders of other users.
    /// </summary>
    public ProcessStartInfo CreateStartInfo(
        IEnumerable<string> command,
        string directory,
        IReadOnlyDictionary<string, string> environment
    )
    {
        var startInfo = new ProcessStartInfo("setpriv")
        {
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        foreach (
            var argument in new[]
            {
                $"--reuid={Uid}",
                $"--regid={Gid}",
                "--clear-groups",
                "--no-new-privs",
                "--",
                "env",
                $"--chdir={directory}",
                "--",
            }.Concat(command)
        )
        {
            startInfo.ArgumentList.Add(argument);
        }

        startInfo.Environment.Clear();
        foreach (var (name, value) in environment)
        {
            startInfo.Environment[name] = value;
        }

        return startInfo;
    }

    /// <summary>
    /// Stops every process of the job user, also a process that left its process group or detached
    /// from its parent. If that fails, the next job could see the processes of this job, so the
    /// service stops. Its container stops with it, and Kubernetes starts a new one.
    /// </summary>
    public async Task StopProcessesAsync()
    {
        try
        {
            await KillUntilNoProcessIsLeftAsync();
        }
        catch (Exception error)
        {
            Environment.FailFast($"Could not stop the processes of {Name}.", error);
        }
    }

    /// <summary>A process can make its /proc folder owned by root, so the check reads the user from the status file.</summary>
    private async Task KillUntilNoProcessIsLeftAsync()
    {
        var stopwatch = Stopwatch.StartNew();
        while (HasLiveProcesses())
        {
            if (stopwatch.Elapsed > _processStopTimeout)
            {
                throw new TimeoutException($"The processes of {Name} did not stop in {_processStopTimeout}.");
            }

            using var kill = new Process
            {
                StartInfo = CreateStartInfo(
                    ["bash", "-c", "kill -KILL -1"],
                    "/",
                    new Dictionary<string, string> { ["PATH"] = SearchPath }
                ),
            };
            kill.Start();
            kill.StandardInput.Close();
            await kill.WaitForExitAsync(CancellationToken.None);
            await Task.Delay(_processStopPollInterval, CancellationToken.None);
        }
    }

    internal static bool IsLiveProcessOf(string status, int uid)
    {
        var fields = status
            .Split('\n')
            .Select(line => line.Split(':', 2))
            .Where(field => field.Length == 2)
            .ToDictionary(field => field[0], field => field[1].Trim());
        var state = fields["State"][0];
        var uids = fields["Uid"]
            .Split(['\t', ' '], StringSplitOptions.RemoveEmptyEntries)
            .Select(value => int.Parse(value, CultureInfo.InvariantCulture));
        return !_stoppedProcessStates.Contains(state) && uids.Contains(uid);
    }

    private bool HasLiveProcesses()
    {
        foreach (var folder in Directory.EnumerateDirectories("/proc"))
        {
            if (!int.TryParse(Path.GetFileName(folder), CultureInfo.InvariantCulture, out _))
            {
                continue;
            }

            string status;
            try
            {
                status = File.ReadAllText(Path.Join(folder, "status"));
            }
            catch (IOException)
            {
                continue; // The process stopped.
            }

            if (IsLiveProcessOf(status, Uid))
            {
                return true;
            }
        }

        return false;
    }
}
