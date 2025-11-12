using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class ParallelismSettings : ISettingsMarker
{
    /// <summary>
    /// Degree of parallellism when fetching files from Gitea
    /// </summary>
    public int FetchFilesFromGitea { get; set; } = 25;

    /// <summary>
    /// Degree of parallellism when uploading files to org library
    /// </summary>
    public int UploadFilesToOrgLibrary { get; set; } = 10;

    /// <summary>
    /// Degree of parallellism when processing repositories in RepositoryBaseSI
    /// </summary>
    public int RepositoryBaseSI { get; set; } = 50;
}
