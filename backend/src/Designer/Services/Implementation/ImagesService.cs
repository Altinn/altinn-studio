using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ImagesService: IImagesService
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
  
  public FileStreamResult GetImage(string org, string repo, string developer, string imageFilePath)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    Stream imageStream = altinnAppGitRepository.GetImageByFilePath(imageFilePath);
    return new FileStreamResult(imageStream, MimeTypeMap.GetMimeType(Path.GetExtension(imageFilePath).ToLower()));
  }

  public List<Stream> GetAllImages(string org, string repo, string developer)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    List<Stream> images = new List<Stream>();
    List<string> imageFileNames = altinnAppGitRepository.GetAllImageFileNames();
    foreach (var imageFilePath in imageFileNames)
    {
      Stream imageStream = altinnAppGitRepository.GetImageByFilePath(imageFilePath);
      images.Add(imageStream);
    }
    return images;
  }

  public List<string> GetAllImageFileNames(string org, string repo, string developer)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    return altinnAppGitRepository.GetAllImageFileNames();
  }

  public async Task UploadImage(string org, string repo, string developer, string imageName, Stream imageStream)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    using MemoryStream imageMemoryStream = new MemoryStream();
    imageStream.CopyTo(imageMemoryStream); 
    await altinnAppGitRepository.SaveImageAsMemoryStream(imageMemoryStream, imageName);
  }

  public async Task DeleteImage(string org, string repo, string developer, string imageFilePath)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    altinnAppGitRepository.DeleteImageByImageFilePath(imageFilePath);
    await Task.CompletedTask;
  }
}