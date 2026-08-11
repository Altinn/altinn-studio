namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IRepositoryDirectoryCleaner
{
    void Delete(string repositoryPath);

    bool TryDeleteIfEmpty(string directoryPath);
}
