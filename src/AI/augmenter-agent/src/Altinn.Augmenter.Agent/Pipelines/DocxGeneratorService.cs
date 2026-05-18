using System.Diagnostics;
using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines;

/// <summary>
/// Renders a Markdown template into a DOCX using the <c>pandoc</c> CLI installed in the image.
/// The template uses <see cref="MarkdownTemplateRenderer"/> placeholders so the same JSON
/// payload that feeds the Typst (PDF) template also feeds the DOCX rendering.
/// </summary>
public interface IDocxGeneratorService
{
    Task<byte[]> GenerateDocxAsync(JsonDocument data, string templatePath, CancellationToken cancellationToken = default);
}

public sealed class DocxGeneratorService(
    ILogger<DocxGeneratorService> logger,
    IConfiguration configuration) : IDocxGeneratorService
{
    private const int TimeoutSeconds = 60;

    public async Task<byte[]> GenerateDocxAsync(
        JsonDocument data,
        string templatePath,
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(templatePath))
            throw new FileNotFoundException($"DOCX template not found: {templatePath}");

        var template = await File.ReadAllTextAsync(templatePath, cancellationToken);
        var markdown = MarkdownTemplateRenderer.Render(template, data);

        var tempDir = Path.Combine(Path.GetTempPath(), "augmenter-agent-docx", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, "input.md");
        var outputPath = Path.Combine(tempDir, "output.docx");

        try
        {
            await File.WriteAllTextAsync(inputPath, markdown, cancellationToken);

            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = configuration["Pandoc:Path"] ?? "pandoc",
                ArgumentList =
                {
                    inputPath,
                    "-o", outputPath,
                    "--from", "markdown",
                    "--to", "docx",
                },
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            process.Start();
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            _ = process.StandardOutput.ReadToEndAsync(cancellationToken);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(TimeoutSeconds));

            try { await process.WaitForExitAsync(cts.Token); }
            catch (OperationCanceledException)
            {
                try { process.Kill(entireProcessTree: true); }
                catch (InvalidOperationException) { /* already exited */ }
                throw new InvalidOperationException($"Pandoc timed out after {TimeoutSeconds} seconds.");
            }

            var stderr = await stderrTask;
            if (process.ExitCode != 0)
            {
                logger.LogError("Pandoc failed (exit {ExitCode}): {Error}", process.ExitCode, stderr);
                throw new InvalidOperationException($"Pandoc DOCX generation failed: {stderr}");
            }

            return await File.ReadAllBytesAsync(outputPath, cancellationToken);
        }
        finally
        {
            try { Directory.Delete(tempDir, recursive: true); }
            catch (Exception ex) { logger.LogWarning(ex, "Failed to clean up temp dir: {TempDir}", tempDir); }
        }
    }
}
