using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ImagesService : IImagesService
{

    private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="altinnGitRepositoryFactory">IAltinnGitRepository</param>
    public ImagesService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    {
        _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
    }

    public Stream GetImage(string org, string repo, string developer, string imageFilePath)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        return altinnAppGitRepository.GetImageAsStreamByFilePath(imageFilePath);
    }

    public List<string> GetAllImageFileNames(string org, string repo, string developer)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        return altinnAppGitRepository.GetAllImageFileNames();
    }

    public async Task UploadImage(string org, string repo, string developer, string imageName, Stream imageStream, bool overrideExisting)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        bool imageExists = altinnAppGitRepository.DoesImageExist(imageName);
        if (imageExists && !overrideExisting)
        {
            throw new ConflictingFileNameException("An image with this name already exists.");
        }
        using MemoryStream imageMemoryStream = new MemoryStream();
        imageStream.CopyTo(imageMemoryStream);
        await altinnAppGitRepository.SaveImageAsMemoryStream(imageMemoryStream, imageName);
    }

    public async Task DeleteImage(string org, string repo, string developer, string imageFilePath)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        await altinnAppGitRepository.DeleteImageByImageFilePath(imageFilePath);
    }
}
