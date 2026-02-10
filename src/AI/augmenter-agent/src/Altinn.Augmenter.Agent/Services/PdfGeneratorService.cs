using System.Diagnostics;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services;

public sealed class PdfGeneratorService(
    ILogger<PdfGeneratorService> logger,
    IConfiguration configuration,
    IOptions<PdfGenerationOptions> pdfOptions) : IPdfGeneratorService
{
    public async Task<byte[]> GeneratePdfAsync(DateTime timestamp, CancellationToken cancellationToken = default)
    {
        var templatePath = Path.Combine(AppContext.BaseDirectory, pdfOptions.Value.TemplatePath);
        var template = await File.ReadAllTextAsync(templatePath, cancellationToken);
        var typContent = string.Format(template, timestamp.ToString("yyyy-MM-dd HH:mm:ss"));

        var tempDir = Path.Combine(Path.GetTempPath(), "augmenter-agent", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, "input.typ");
        var outputPath = Path.Combine(tempDir, "output.pdf");

        try
        {
            await File.WriteAllTextAsync(inputPath, typContent, cancellationToken);

            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = configuration["Typst:Path"] ?? "typst",
                Arguments = $"compile \"{inputPath}\" \"{outputPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            process.Start();

            // Read stdout and stderr concurrently to avoid deadlocks
            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();

            var timeoutSeconds = pdfOptions.Value.ProcessTimeoutSeconds;
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

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
                    $"Typst process timed out after {timeoutSeconds} seconds.");
            }

            var stderr = await stderrTask;
            // Ensure stdout is also consumed
            await stdoutTask;

            if (process.ExitCode != 0)
            {
                logger.LogError("Typst compilation failed (exit code {ExitCode}): {Error}", process.ExitCode, stderr);
                throw new InvalidOperationException($"Typst compilation failed: {stderr}");
            }

            return await File.ReadAllBytesAsync(outputPath, cancellationToken);
        }
        finally
        {
            try
            {
                Directory.Delete(tempDir, recursive: true);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to clean up temp directory: {TempDir}", tempDir);
            }
        }
    }
}
