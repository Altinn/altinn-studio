using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryDirectoryCleaner : IRepositoryDirectoryCleaner
{
    public void Delete(string repositoryPath)
    {
        DirectoryHelper.DeleteFilesAndDirectory(repositoryPath);
    }
}
