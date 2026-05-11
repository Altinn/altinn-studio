using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.DockerfileRewriters.Extensions;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.DockerfileRewriters;

/// <summary>
/// Rewrites the dockerfile
/// </summary>
internal sealed class DockerfileRewriter
{
    private readonly string _dockerFilePath;
    private readonly string _targetFramework;

    /// <summary>
    /// Creates a new instance of the <see cref="DockerfileRewriter"/> class
    /// </summary>
    /// <param name="dockerFilePath"></param>
    /// <param name="targetFramework"></param>
    public DockerfileRewriter(string dockerFilePath, string targetFramework = "net8.0")
    {
        _dockerFilePath = dockerFilePath;
        _targetFramework = targetFramework;
    }

    /// <summary>
    /// Upgrades the dockerfile
    /// </summary>
    public async Task Upgrade()
    {
        var dockerFile = await File.ReadAllLinesAsync(_dockerFilePath);
        var newDockerFile = new List<string>();
        foreach (var line in dockerFile)
        {
            var imageTag = GetImageTagFromFrameworkVersion(_targetFramework);
            newDockerFile.Add(line.ReplaceSdkVersion(imageTag).ReplaceAspNetVersion(imageTag));
        }

        await File.WriteAllLinesAsync(_dockerFilePath, newDockerFile);
    }

    private static string GetImageTagFromFrameworkVersion(string targetFramework)
    {
        return targetFramework switch
        {
            "net6.0" => "6.0-alpine",
            "net7.0" => "7.0-alpine",
            _ => "8.0-alpine",
        };
    }
}
