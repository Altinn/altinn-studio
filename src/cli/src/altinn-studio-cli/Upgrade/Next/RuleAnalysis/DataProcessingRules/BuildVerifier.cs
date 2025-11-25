using System.Diagnostics;
using System.Text;

namespace Altinn.Studio.Cli.Upgrade.Next.RuleAnalysis.DataProcessingRules;

/// <summary>
/// Result of a build verification
/// </summary>
internal class BuildVerificationResult
{
    public bool Success { get; set; }
    public string? Output { get; set; }
    public string? ErrorOutput { get; set; }
    public List<string> Errors { get; } = new();
}

/// <summary>
/// Verifies that an app builds successfully after code generation
/// </summary>
internal class BuildVerifier
{
    private readonly string _appBasePath;

    public BuildVerifier(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Run dotnet build and verify it succeeds
    /// </summary>
    public BuildVerificationResult VerifyBuild(int timeoutSeconds = 120)
    {
        var result = new BuildVerificationResult();

        try
        {
            var processStartInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = "build --no-restore",
                WorkingDirectory = _appBasePath,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            var outputBuilder = new StringBuilder();
            var errorBuilder = new StringBuilder();

            using var process = new Process { StartInfo = processStartInfo };

            process.OutputDataReceived += (sender, args) =>
            {
                if (args.Data != null)
                {
                    outputBuilder.AppendLine(args.Data);
                }
            };

            process.ErrorDataReceived += (sender, args) =>
            {
                if (args.Data != null)
                {
                    errorBuilder.AppendLine(args.Data);
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            var completed = process.WaitForExit(timeoutSeconds * 1000);

            if (!completed)
            {
                process.Kill();
                result.Success = false;
                result.Errors.Add($"Build timed out after {timeoutSeconds} seconds");
                return result;
            }

            result.Output = outputBuilder.ToString();
            result.ErrorOutput = errorBuilder.ToString();

            // Parse build output for errors and warnings
            ParseBuildOutput(result.Output, result);
            ParseBuildOutput(result.ErrorOutput, result);

            result.Success = process.ExitCode == 0;

            if (!result.Success && result.Errors.Count == 0)
            {
                result.Errors.Add($"Build failed with exit code {process.ExitCode}");
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Errors.Add($"Exception during build: {ex.Message}");
        }

        return result;
    }

    private void ParseBuildOutput(string? output, BuildVerificationResult result)
    {
        if (string.IsNullOrEmpty(output))
        {
            return;
        }

        var lines = output.Split('\n');

        foreach (var line in lines)
        {
            var trimmed = line.Trim();

            // Look for error patterns
            if (
                trimmed.Contains("error CS")
                || trimmed.Contains("error MSB")
                || (trimmed.Contains("error") && trimmed.Contains(":"))
            )
            {
                result.Errors.Add(trimmed);
            }
        }
    }
}
