using System.Diagnostics;
using System.Text;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services.Agent;

/// <summary>
/// Runs the Pi CLI (<c>pi.dev</c>) in print mode. System prompt is loaded from a mounted
/// skill folder; user prompt is piped via stdin. Output is the raw text response on stdout.
/// Authentication is via the standard ANTHROPIC_API_KEY env var (or OPENAI_API_KEY etc),
/// resolved by Pi itself based on <see cref="AgentOptions.Provider"/>.
/// </summary>
public sealed class PiCliAgentService(
    IOptions<AgentOptions> options,
    ILogger<PiCliAgentService> logger) : IAgentService
{
    public async Task<string> RunAsync(AgentRequest request, CancellationToken cancellationToken = default)
    {
        var opts = options.Value;

        var systemPrompt = await SkillLoader.LoadAsync(request.SkillFolder, cancellationToken);

        logger.LogInformation(
            "Starting Pi CLI agent (skill={SkillFolder}, model={Model}, systemPromptLength={Length})",
            request.SkillFolder, opts.Model ?? "default", systemPrompt.Length);

        using var process = new Process();
        process.StartInfo = CreateStartInfo(opts, systemPrompt);

        logger.LogDebug("Pi CLI process launching (args count={Count})",
            process.StartInfo.ArgumentList.Count);

        process.Start();
        logger.LogDebug("Pi CLI process started (PID={Pid})", process.Id);

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
            try { process.Kill(entireProcessTree: true); }
            catch (InvalidOperationException) { /* already exited */ }

            throw new InvalidOperationException(
                $"Pi CLI process timed out after {opts.TimeoutSeconds} seconds.");
        }

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            logger.LogError(
                "Pi CLI failed (exit code {ExitCode}). Stdout: {Stdout}. Stderr: {Stderr}",
                process.ExitCode, stdout, stderr);
            throw new InvalidOperationException($"Pi CLI failed (exit {process.ExitCode}): {stderr}");
        }

        logger.LogInformation("Pi CLI completed ({Length} chars output)", stdout.Length);
        return stdout;
    }

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

        if (!string.IsNullOrEmpty(opts.Model))
        {
            psi.ArgumentList.Add("--model");
            psi.ArgumentList.Add(opts.Model);
        }

        psi.ArgumentList.Add("--system-prompt");
        psi.ArgumentList.Add(systemPrompt);

        // Pi reads provider auth from standard env vars (ANTHROPIC_API_KEY, etc).
        // ApiKey on AgentOptions is an explicit override only.
        if (!string.IsNullOrEmpty(opts.ApiKey))
            psi.Environment["ANTHROPIC_API_KEY"] = opts.ApiKey;

        return psi;
    }
}
