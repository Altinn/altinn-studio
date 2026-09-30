using System.Diagnostics;

namespace Altinn.Studio.StudioctlServer.Platform;

internal static class ProcessUtil
{
    public static ProcessStartInfo CreateStartInfo(string fileName, string? arguments = null)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        if (arguments is not null)
            startInfo.Arguments = arguments;

        return startInfo;
    }

    public static ProcessStartInfo CreateStartInfo(string fileName, params string[] arguments)
    {
        var startInfo = CreateStartInfo(fileName);
        foreach (var argument in arguments)
        {
            startInfo.ArgumentList.Add(argument);
        }

        return startInfo;
    }
}
