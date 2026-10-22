using System.Diagnostics;

namespace Altinn.Studio.StudioctlServer.Platform;

internal static class ProcessUtil
{
    /// <summary>
    /// Lets the dotnet host select the SDK for the child process and its working directory.
    /// MSBuildLocator sets these paths for in-process MSBuild; inheriting them would force child
    /// restores and builds to use that SDK, even when the app's global.json selects another one.
    /// </summary>
    public static ProcessStartInfo CreateDotnetStartInfo(params string[] arguments)
    {
        var startInfo = CreateStartInfo("dotnet", arguments);
        startInfo.Environment.Remove("MSBUILD_EXE_PATH");
        startInfo.Environment.Remove("MSBuildSDKsPath");
        startInfo.Environment.Remove("MSBuildExtensionsPath");
        return startInfo;
    }

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
