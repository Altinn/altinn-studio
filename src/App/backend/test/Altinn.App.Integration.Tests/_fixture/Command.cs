using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Integration.Tests;

internal sealed record CommandResult(string StdOut);

internal sealed record Command(
    string Cmd,
    string Arguments,
    string WorkingDirectory,
    ILogger? Logger = null,
    CancellationToken CancellationToken = default
)
{
    public TaskAwaiter<CommandResult> GetAwaiter() => Run().GetAwaiter();

    private async Task<CommandResult> Run()
    {
        var tcs = new TaskCompletionSource<CommandResult>(TaskCreationOptions.RunContinuationsAsynchronously);
        var firstArgumentWhitespace = Arguments.IndexOf(' ');
        var firstArgument = firstArgumentWhitespace > 0 ? Arguments[..firstArgumentWhitespace] : null;
        var cmd = $"{Cmd}{(firstArgument is not null ? $" {firstArgument}" : string.Empty)}";
        // NOTE: this is running on a thread only because there is/was some kind of hanging/deadlock issue
        // where `dotnet pack` commands would seemingly complete (as observed from e.g. htop) but the .NET process
        // machinery did not proceed or get the exit signal when using the normal async APIs and/or the CliWrap library.
        // This issue happens rarely.. The hope is that either this works more reliably or if it hangs again we can do
        // a process dump or something that will let us inspect the stacks to further debug this.
        var thread = new Thread(() =>
        {
            try
            {
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = Cmd,
                    Arguments = Arguments,
                    WorkingDirectory = WorkingDirectory,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true,
                };

                using Process proc = new Process();
                proc.StartInfo = processStartInfo;

                var @lock = new object();
                var stdout = new StringBuilder();
                var stderr = new StringBuilder();
                var allOutput = new StringBuilder();
                proc.OutputDataReceived += (_, args) =>
                {
                    if (args.Data is null)
                        return;

                    Logger?.LogInformation("'{Command}' stdout: {Line}", cmd, args.Data);
                    lock (@lock)
                    {
                        stdout.AppendLine(args.Data);
                        allOutput.AppendLine(args.Data);
                    }
                };
                proc.ErrorDataReceived += (_, args) =>
                {
                    if (args.Data is null)
                        return;

                    Logger?.LogError("'{Command}' stderr: {Line}", cmd, args.Data);
                    lock (@lock)
                    {
                        stderr.AppendLine(args.Data);
                        allOutput.AppendLine(args.Data);
                    }
                };
                proc.Start();
                proc.BeginOutputReadLine();
                proc.BeginErrorReadLine();

                try
                {
                    bool exited = false;
                    do
                    {
                        CancellationToken.ThrowIfCancellationRequested();
                        exited = proc.WaitForExit(TimeSpan.FromSeconds(0.5));
                    } while (!exited);

                    // WaitForExit() can hang indefinitely while draining redirected output from dotnet pack.
                    // The command has exited at this point, so only give output handlers a bounded grace period.
                    proc.WaitForExit(TimeSpan.FromSeconds(5));

                    if (proc.ExitCode != 0)
                    {
                        string outputMessage;
                        lock (@lock)
                            outputMessage = allOutput.ToString();

                        throw new Exception(
                            $"Command '{cmd}' failed with exit code {proc.ExitCode}.\nOutput: {outputMessage}\nWorking Directory: {WorkingDirectory}"
                        );
                    }

                    CommandResult result;
                    lock (@lock)
                    {
                        result = new CommandResult(stdout.ToString());
                    }

                    tcs.SetResult(result);
                    return;
                }
                catch (OperationCanceledException)
                {
                    try
                    {
                        proc.Kill(entireProcessTree: true);
                    }
                    catch { }
                    tcs.SetException(new OperationCanceledException(CancellationToken));
                    return;
                }
            }
            catch (Exception ex)
            {
                tcs.TrySetException(ex);
            }
        });
        thread.Name = $"{cmd}";
        thread.Start();
        return await tcs.Task;
    }
}
