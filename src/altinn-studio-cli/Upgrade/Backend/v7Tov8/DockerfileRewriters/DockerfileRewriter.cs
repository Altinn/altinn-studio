using Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.DockerfileRewriters.Extensions;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.DockerfileRewriters;

/// <summary>
/// Rewrites the dockerfile
/// </summary>
public class DockerfileRewriter
{
    private readonly string dockerFilePath;
    private readonly string targetFramework;
    
    /// <summary>
    /// Creates a new instance of the <see cref="DockerfileRewriter"/> class
    /// </summary>
    /// <param name="dockerFilePath"></param>
    /// <param name="targetFramework"></param>
    public DockerfileRewriter(string dockerFilePath, string targetFramework = "net8.0")
    {
        this.dockerFilePath = dockerFilePath;
        this.targetFramework = targetFramework;
    }
    
    /// <summary>
    /// Upgrades the dockerfile
    /// </summary>
    public async Task Upgrade()
    {
        var dockerFile = await File.ReadAllLinesAsync(dockerFilePath);
        var newDockerFile = new List<string>();
        foreach (var line in dockerFile)
        {
            var imageTag = GetImageTagFromFrameworkVersion(targetFramework);
            newDockerFile.Add(line.ReplaceSdkVersion(imageTag).ReplaceAspNetVersion(imageTag));
        }

        await File.WriteAllLinesAsync(dockerFilePath, newDockerFile);
    }
    
    private static string GetImageTagFromFrameworkVersion(string targetFramework)
    {
        return targetFramework switch
        {
            "net6.0" => "6.0-alpine",
            "net7.0" => "7.0-alpine",
            _ => "8.0-alpine"
        };
    }
}