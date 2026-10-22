#nullable disable
using System.IO;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppVersionService : IAppVersionService
{
    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    // Adjust it if the first release that reads taskIds gets another number.
    private static readonly SemanticVersion s_firstAppLibVersionReadingDataTypeTaskIds = SemanticVersion.Parse(
        "9.0.0-preview.9"
    );

    public AppVersionService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    public SemanticVersion GetAppLibVersion(AltinnRepoEditingContext altinnRepoEditingContext)
    {
        AltinnAppGitRepository repository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            altinnRepoEditingContext.Org,
            altinnRepoEditingContext.Repo,
            altinnRepoEditingContext.Developer
        );

        return repository.GetAppLibVersion();
    }

    public bool IsV9App(AltinnRepoEditingContext altinnRepoEditingContext)
    {
        try
        {
            SemanticVersion version = GetAppLibVersion(altinnRepoEditingContext);
            return version != null && version.Major >= 9;
        }
        catch (FileNotFoundException)
        {
            return true;
        }
    }

    public bool UsesDataTypeTaskIds(AltinnRepoEditingContext altinnRepoEditingContext)
    {
        SemanticVersion version = GetAppLibVersion(altinnRepoEditingContext);
        return version != null && version >= s_firstAppLibVersionReadingDataTypeTaskIds;
    }
}
