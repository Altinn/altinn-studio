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

  public List<FileStreamResult> GetAllImages(string org, string repo, string developer)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    List<FileStreamResult> images = new List<FileStreamResult>();
    List<string> imageFileNames = altinnAppGitRepository.GetAllImageFileNames();
    foreach (var imageFilePath in imageFileNames)
    {
      Stream imageStream = altinnAppGitRepository.GetImageByFilePath(imageFilePath);
      images.Add(new FileStreamResult(
        imageStream,
        MimeTypeMap.GetMimeType(Path.GetExtension(imageFilePath).ToLower())
      ));
    }
    return images;
  }

  public List<string> GetAllImageFileNames(string org, string repo, string developer)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    return altinnAppGitRepository.GetAllImageFileNames();
  }

  public Task UploadImage(string org, string repo, string developer, string imageName, Stream imageStream)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    using MemoryStream imageMemoryStream = new MemoryStream();
    imageStream.CopyTo(imageMemoryStream);
    return altinnAppGitRepository.SaveImageAsMemoryStream(imageMemoryStream, imageName);
  }

  public async Task DeleteImage(string org, string repo, string developer, string imageFilePath)
  {
    var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
    altinnAppGitRepository.DeleteFileByAbsolutePath(imageFilePath); 
    await Task.CompletedTask;
  }
}