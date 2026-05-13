using System.Diagnostics;
using System.Text;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services.Agent;

public sealed class ClaudeCliAgentService(
    IOptions<AgentOptions> options,
    ILogger<ClaudeCliAgentService> logger) : IAgentService
{
    public async Task<string> RunAsync(AgentRequest request, CancellationToken cancellationToken = default)
    {
        var opts = options.Value;

        var systemPrompt = await SkillLoader.LoadAsync(request.SkillFolder, cancellationToken);

        var isLocalServer = opts.UseLocalProvider && !string.IsNullOrEmpty(opts.ApiBaseUrl);
        logger.LogInformation(
            "Starting Claude CLI agent (skill={SkillFolder}, model={Model}, systemPromptLength={Length}, localServer={LocalServer})",
            request.SkillFolder, opts.Model ?? "default", systemPrompt.Length,
            isLocalServer ? opts.ApiBaseUrl : "none");

        using var process = new Process();
        process.StartInfo = CreateStartInfo(opts, systemPrompt);

        // Log the complete command line for debugging
        var commandLine = $"{process.StartInfo.FileName} {string.Join(" ", process.StartInfo.ArgumentList)}";
        logger.LogDebug("Claude CLI command line: {CommandLine}", commandLine);

        logger.LogDebug("Claude CLI process launching (args count={Count})",
            process.StartInfo.ArgumentList.Count);

        process.Start();

        logger.LogDebug("Claude CLI process started (PID={Pid})", process.Id);

        await process.StandardInput.WriteAsync(request.UserPrompt);
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(opts.TimeoutSeconds));

        try
        {
            await process.WaitForExitAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            try
            {
                process.Kill(entireProcessTree: true);
            }
            catch (InvalidOperationException)
            {
                // Process may have already exited
            }

            throw new InvalidOperationException(
                $"Claude CLI process timed out after {opts.TimeoutSeconds} seconds.");
        }

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "Claude CLI failed (exit code {ExitCode}). Stdout: {Stdout}. Stderr: {Stderr}",
                process.ExitCode, stdout, stderr);
            throw new InvalidOperationException($"Claude CLI failed (exit {process.ExitCode}): {stderr}");
        }

        logger.LogInformation(
            "Claude CLI completed successfully ({Length} chars output). Output: {Output}",
            stdout.Length, stdout);

        return stdout;
    }

    /// <summary>
    /// Uses ArgumentList so .NET handles per-platform quoting automatically.
    /// The system prompt (~28KB) is passed via --system-prompt as a real argument,
    /// which stays within Windows' 32KB command-line limit.
    /// </summary>
    private static ProcessStartInfo CreateStartInfo(AgentOptions opts, string systemPrompt)
    {
        var psi = new ProcessStartInfo
        {
            FileName = opts.CliPath,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };

        psi.ArgumentList.Add("-p");
        psi.ArgumentList.Add("--output-format");
        psi.ArgumentList.Add("text");
        psi.ArgumentList.Add("--max-turns");
        psi.ArgumentList.Add("1");

        if (opts.Model is not null)
        {
            psi.ArgumentList.Add("--model");
            psi.ArgumentList.Add(opts.Model);
        }

        psi.ArgumentList.Add("--system-prompt");
        psi.ArgumentList.Add(systemPrompt);

        // Route to local server (e.g. LM Studio) when configured
        if (opts.UseLocalProvider && !string.IsNullOrEmpty(opts.ApiBaseUrl))
        {
            //psi.Environment["ANTHROPIC_BASE_URL"] = opts.ApiBaseUrl;
            //psi.Environment["ANTHROPIC_AUTH_TOKEN"] = opts.ApiAuthToken ?? "lmstudio";
        }

        return psi;
    }
}
