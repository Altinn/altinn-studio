#nullable disable
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using Altinn.Studio.Designer.Helpers;

namespace Designer.Tests.Utils;

public static class CommandExecutor
{
    public static bool TryExecute(string command, out string output, out string error)
    {
        Guard.AssertArgumentNotNullOrWhiteSpace(command, nameof(command));

        string shell = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? "cmd.exe"
            : "/bin/sh";

        string args = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
            ? $"/c \"{command}\""
            : $"-c \"{command.Replace("\"", "\\\"")}\"";

        var outputSb = new StringBuilder();
        var errorSb = new StringBuilder();

        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = shell,
            Arguments = args,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        process.OutputDataReceived += (_, e) => AppendIfNotNull(outputSb, e.Data);
        process.ErrorDataReceived += (_, e) => AppendIfNotNull(errorSb, e.Data);

        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        process.WaitForExit();

        output = outputSb.ToString().Trim();
        error = errorSb.ToString().Trim();
        return process.ExitCode == 0;
    }

    private static void AppendIfNotNull(StringBuilder sb, string content)
    {
        if (!string.IsNullOrEmpty(content))
        {
            sb.AppendLine(content);
        }
    }
}
