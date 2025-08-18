using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.CompilerServices;
using System.Text;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Integration.Tests;

internal sealed record CommandResult(int? ExitCode, string StdOut, string StdErr, string AllOutput)
{
    [MemberNotNullWhen(true, nameof(ExitCode))]
    public bool IsSuccess => ExitCode is 0;

    public override string ToString() => $"ExitCode: {ExitCode}, AllOutput: {AllOutput}";
}

internal sealed record Command(
    string Cmd,
    string Arguments,
    string WorkingDirectory,
    ILogger? Logger = null,
    bool ThrowOnNonZero = true,
    CancellationToken CancellationToken = default
)
{
    public TaskAwaiter<CommandResult> GetAwaiter() => Run().GetAwaiter();

    public async Task<T> Select<T>(Func<CommandResult, T> selector)
    {
        var result = await this;
        return selector(result);
    }

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
                    Logger?.LogInformation("'{Command}' stdout: {Line}", cmd, args.Data);
                    lock (@lock)
                    {
                        stdout.AppendLine(args.Data);
                        allOutput.AppendLine(args.Data);
                    }
                };
                proc.ErrorDataReceived += (_, args) =>
                {
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

                    if (ThrowOnNonZero && proc.ExitCode != 0)
                    {
                        throw new Exception(
                            $"Command '{cmd}' failed with exit code {proc.ExitCode}.\nOutput: {allOutput}\nWorking Directory: {WorkingDirectory}"
                        );
                    }

                    tcs.SetResult(
                        new CommandResult(proc.ExitCode, stdout.ToString(), stderr.ToString(), allOutput.ToString())
                    );
                    return;
                }
                catch (OperationCanceledException)
                {
                    try
                    {
                        proc.Kill();
                    }
                    catch { }
                    tcs.SetResult(
                        new CommandResult(proc.ExitCode, stdout.ToString(), stderr.ToString(), allOutput.ToString())
                    );
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
