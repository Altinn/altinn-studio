using System.Diagnostics;

namespace Altinn.Augmenter.Agent.Services;

public sealed class PdfGeneratorService(ILogger<PdfGeneratorService> logger, IConfiguration configuration) : IPdfGeneratorService
{
    private const string TypstTemplate = """
        #set page(paper: "a4", margin: 2cm)
        #set text(size: 14pt)

        #text(size: 20pt, weight: "bold", fill: rgb("#1565C0"))[Altinn Augmenter Agent]

        #v(1cm)

        #text(size: 12pt)[Generated: {0} UTC]

        #v(1fr)

        #align(center)[
          #context counter(page).display("1 of 1", both: true)
        ]
        """;

    public async Task<byte[]> GeneratePdfAsync(DateTime timestamp)
    {
        var typContent = string.Format(TypstTemplate, timestamp.ToString("yyyy-MM-dd HH:mm:ss"));

        var tempDir = Path.Combine(Path.GetTempPath(), "augmenter-agent", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);

        var inputPath = Path.Combine(tempDir, "input.typ");
        var outputPath = Path.Combine(tempDir, "output.pdf");

        try
        {
            await File.WriteAllTextAsync(inputPath, typContent);

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

            var stderr = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                logger.LogError("Typst compilation failed (exit code {ExitCode}): {Error}", process.ExitCode, stderr);
                throw new InvalidOperationException($"Typst compilation failed: {stderr}");
            }

            return await File.ReadAllBytesAsync(outputPath);
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
