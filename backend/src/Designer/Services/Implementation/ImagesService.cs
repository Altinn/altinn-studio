using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Models;
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

    public Stream GetImage(AltinnRepoEditingContext altinnRepoEditingContext, string imageFilePath)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
        return altinnAppGitRepository.GetImageAsStreamByFilePath(imageFilePath);
    }

    public List<string> GetAllImageFileNames(AltinnRepoEditingContext altinnRepoEditingContext)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
        return altinnAppGitRepository.GetAllImageFileNames();
    }

    public async Task UploadImage(AltinnRepoEditingContext altinnRepoEditingContext, string imageName, Stream imageStream, bool overrideExisting)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
        bool imageExists = altinnAppGitRepository.DoesImageExist(imageName);
        if (imageExists && !overrideExisting)
        {
            throw new ConflictingFileNameException("An image with this name already exists.");
        }
        using MemoryStream imageMemoryStream = new MemoryStream();
        imageStream.CopyTo(imageMemoryStream);
        await altinnAppGitRepository.SaveImageAsMemoryStream(imageMemoryStream, imageName);
    }

    public async Task DeleteImage(AltinnRepoEditingContext altinnRepoEditingContext, string imageFilePath)
    {
        var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(altinnRepoEditingContext.Org, altinnRepoEditingContext.Repo, altinnRepoEditingContext.Developer);
        await altinnAppGitRepository.DeleteImageByImageFilePath(imageFilePath);
    }
}
