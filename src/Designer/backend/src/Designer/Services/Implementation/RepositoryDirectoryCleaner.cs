using System;
using System.IO;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class RepositoryDirectoryCleaner : IRepositoryDirectoryCleaner
{
    public void Delete(string repositoryPath)
    {
        DirectoryHelper.DeleteFilesAndDirectory(repositoryPath);
    }

    public bool TryDeleteIfEmpty(string directoryPath)
    {
        try
        {
            Directory.Delete(directoryPath, recursive: false);
            return true;
        }
        catch (DirectoryNotFoundException)
        {
            return false;
        }
        catch (IOException)
        {
            return false;
        }
        catch (UnauthorizedAccessException)
        {
            return false;
        }
    }
}
