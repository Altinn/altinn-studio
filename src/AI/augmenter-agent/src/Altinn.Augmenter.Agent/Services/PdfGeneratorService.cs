using System.Diagnostics;
using System.Text.Json;
using Altinn.Augmenter.Agent.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Services;

public sealed class PdfGeneratorService(
    ILogger<PdfGeneratorService> logger,
    IConfiguration configuration,
    IOptions<PdfGenerationOptions> pdfOptions) : IPdfGeneratorService
{
    public async Task<byte[]> GeneratePdfAsync(
        JsonDocument data,
        string templatePath,
        CancellationToken cancellationToken = default)
    {
        var templateDir = Path.Combine(AppContext.BaseDirectory, "pdf-templates");
        var templateFile = Path.GetFileName(templatePath);

        var tempDir = Path.Combine(Path.GetTempPath(), "augmenter-agent", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, templateFile);
        var outputPath = Path.Combine(tempDir, "output.pdf");
        var dataPath = Path.Combine(tempDir, "data.json");

        try
        {
            CopyTemplateFiles(templateDir, tempDir);

            await using (var fs = File.Create(dataPath))
            {
                using var writer = new Utf8JsonWriter(fs, new JsonWriterOptions { Indented = true });
                data.WriteTo(writer);
            }

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

            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);

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

    private static void CopyTemplateFiles(string sourceDir, string targetDir)
    {
        if (!Directory.Exists(sourceDir))
            return;

        foreach (var file in Directory.GetFiles(sourceDir))
        {
            var destFile = Path.Combine(targetDir, Path.GetFileName(file));
            File.Copy(file, destFile, overwrite: true);
        }
    }
}
