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
    public List<string> Warnings { get; } = new();
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
            // First, run dotnet restore
            var restoreResult = RunDotnetCommand("restore", timeoutSeconds / 2);
            if (!restoreResult.Success)
            {
                result.Success = false;
                result.Errors.AddRange(restoreResult.Errors);
                result.Output = restoreResult.Output;
                result.ErrorOutput = restoreResult.ErrorOutput;
                return result;
            }

            // Then run the build
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

            // Extract all lines containing DataProcessor file paths
            ExtractDataProcessorLines(result.Output, result);
            ExtractDataProcessorLines(result.ErrorOutput, result);

            // Build is successful if no DataProcessor-related lines were found
            result.Success = result.Errors.Count == 0;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Errors.Add($"Exception during build: {ex.Message}");
        }

        return result;
    }

    private BuildVerificationResult RunDotnetCommand(string command, int timeoutSeconds)
    {
        var result = new BuildVerificationResult();

        try
        {
            var processStartInfo = new ProcessStartInfo
            {
                FileName = "dotnet",
                Arguments = command,
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
                result.Errors.Add($"Command '{command}' timed out after {timeoutSeconds} seconds");
                return result;
            }

            result.Output = outputBuilder.ToString();
            result.ErrorOutput = errorBuilder.ToString();

            // Extract DataProcessor lines from restore output
            ExtractDataProcessorLines(result.Output, result);
            ExtractDataProcessorLines(result.ErrorOutput, result);

            result.Success = result.Errors.Count == 0;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Errors.Add($"Exception during '{command}': {ex.Message}");
        }

        return result;
    }

    /// <summary>
    /// Extract error lines containing DataProcessor file paths from build output
    /// </summary>
    private void ExtractDataProcessorLines(string? output, BuildVerificationResult result)
    {
        if (string.IsNullOrEmpty(output))
        {
            return;
        }

        var lines = output.Split('\n');

        foreach (var line in lines)
        {
            var trimmed = line.Trim();

            // Include any line that contains the DataProcessor file path pattern
            // Match /App/logic/*DataProcessor.cs but not /App/logic/*/DataProcessor.cs (in subfolders)
            if (trimmed.Contains("/App/logic/") && trimmed.Contains("DataProcessor.cs"))
            {
                // Extract the portion between /App/logic/ and DataProcessor.cs to ensure no slashes
                var logicIndex = trimmed.IndexOf("/App/logic/");
                var dataProcessorIndex = trimmed.IndexOf("DataProcessor.cs", logicIndex);

                if (logicIndex >= 0 && dataProcessorIndex > logicIndex)
                {
                    var betweenPart = trimmed.Substring(
                        logicIndex + "/App/logic/".Length,
                        dataProcessorIndex - (logicIndex + "/App/logic/".Length)
                    );

                    // Only include if there's no slash in the filename portion
                    // AND the line contains "error" (case-insensitive) but not "warning"
                    if (!betweenPart.Contains('/'))
                    {
                        var lowerLine = trimmed.ToLowerInvariant();
                        if (lowerLine.Contains("error") && !lowerLine.Contains("warning"))
                        {
                            result.Errors.Add(trimmed);
                        }
                    }
                }
            }
        }
    }
}
