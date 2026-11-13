using System.ComponentModel;
using System.Diagnostics;

namespace Altinn.Studio.Fleet.Cli;

/// <summary>
/// Gets the API keys from studioctl, which stores them when its user logs in. It runs
/// <c>studioctl auth token --env NAME</c> once per installation, and never writes the key anywhere.
/// </summary>
internal sealed class StudioctlCredentials(string executable = "studioctl") : IStudioCredentials
{
    private readonly Dictionary<string, string> _problems = new(StringComparer.Ordinal);
    private readonly Lock _gate = new();

    /// <summary>Why studioctl gave no key, by installation, for the summary.</summary>
    public IReadOnlyDictionary<string, string> Problems
    {
        get
        {
            lock (_gate)
            {
                return new Dictionary<string, string>(_problems);
            }
        }
    }

    public async ValueTask<string?> GetApiKey(StudioHost host, CancellationToken cancellationToken)
    {
        var start = new ProcessStartInfo(executable)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };

        // studioctl colors its errors even when they are not written to a terminal, and its message is shown as text.
        start.Environment["NO_COLOR"] = "1";
        foreach (string arg in (string[])["auth", "token", "--env", host.Name])
        {
            start.ArgumentList.Add(arg);
        }

        Process process;
        try
        {
            process = Process.Start(start) ?? throw new StudioCredentialsException($"Could not start {executable}.");
        }
        catch (Win32Exception ex)
        {
            throw new StudioCredentialsException(
                $"Could not run {executable}, which fleet asks for Altinn Studio API keys. Install studioctl and run "
                    + "`studioctl auth login`.",
                ex
            );
        }

        using (process)
        {
            Task<string> output = process.StandardOutput.ReadToEndAsync(cancellationToken);
            Task<string> error = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);
            string key = (await output).Trim();
            if (process.ExitCode == 0 && key.Length > 0)
            {
                return key;
            }

            string problem = (await error).Trim();
            lock (_gate)
            {
                _problems[host.HostName.Value] =
                    problem.Length > 0 ? FirstLine(problem) : $"exit code {process.ExitCode}";
            }

            return null;
        }
    }

    private static string FirstLine(string text)
    {
        int newline = text.IndexOf('\n', StringComparison.Ordinal);
        return (newline < 0 ? text : text[..newline]).Trim();
    }
}
