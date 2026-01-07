using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.DockerfileRewriters.Extensions;

/// <summary>
/// Extensions for string replacing tags in dockerfiles
/// </summary>
internal static class DockerfileStringExtensions
{
    /// <summary>
    /// Replaces the dotnet sdk image tag version in a dockerfile
    /// </summary>
    /// <param name="line">a line in the dockerfile</param>
    /// <param name="imageTag">the new image tag</param>
    /// <returns></returns>
    public static string ReplaceSdkVersion(this string line, string imageTag)
    {
        const string pattern = @"(^FROM mcr.microsoft.com/dotnet/sdk):(.+?)( AS .*)?$";
        return Regex.Replace(line, pattern, $"$1:{imageTag}$3");
    }

    /// <summary>
    /// Replaces the aspnet image tag version in a dockerfile
    /// </summary>
    /// <param name="line">a line in the dockerfile</param>
    /// <param name="imageTag">the new image tag</param>
    /// <returns></returns>
    public static string ReplaceAspNetVersion(this string line, string imageTag)
    {
        const string pattern = @"(^FROM mcr.microsoft.com/dotnet/aspnet):(.+?)( AS .*)?$";
        return Regex.Replace(line, pattern, $"$1:{imageTag}$3");
    }
}
