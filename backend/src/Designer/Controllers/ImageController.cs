using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Microsoft.Net.Http.Headers;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions related to images
/// </summary>
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{repo:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/images")]
public class ImageController : ControllerBase
{
  
  private readonly IImagesService _imagesService;
  
  /// <summary>
  /// Initializes a new instance of the <see cref="ImageController"/> class.
  /// </summary>
  /// <param name="imagesService">The images service.</param>
  public ImageController(IImagesService imagesService)
  {
    _imagesService = imagesService;
  }

  /// <summary>
  /// Endpoint for getting a specific image
  /// </summary>
  /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
  /// <param name="repo">Application identifier which is unique within an organisation.</param>
  /// <param name="imageName">Name of image file to fetch</param>
  /// <returns>Image</returns>
  [HttpGet] // add routeParam or use queryParam?
  [ProducesResponseType(StatusCodes.Status200OK)]
  public ActionResult<FileStreamResult> GetImageByName(string org, string repo, [FromRoute] string imageName)
  {
    string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
    
    var image = _imagesService.GetImage(org, repo, developer, imageName);

    return Ok(image);
  }
  
  /// <summary>
  /// Endpoint for getting all images in application
  /// </summary>
  /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
  /// <param name="repo">Application identifier which is unique within an organisation.</param>
  /// <returns>All images</returns>
  [HttpGet("all")]
  [ProducesResponseType(StatusCodes.Status200OK)]
  public ActionResult<List<Stream>> GetAllImages(string org, string repo)
  {
    string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
    
    List<Stream> images = _imagesService.GetAllImages(org, repo, developer);

    return Ok(images);
  }
  
  /// <summary>
  /// Endpoint for getting all image file names in application
  /// </summary>
  /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
  /// <param name="repo">Application identifier which is unique within an organisation.</param>
  /// <returns>All image file names</returns>
  [HttpGet("fileNames")]
  [ProducesResponseType(StatusCodes.Status200OK)]
  public ActionResult<List<string>> GetAllImagesFileNames(string org, string repo)
  {
    string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
    
    List<string> imageFileNames = _imagesService.GetAllImageFileNames(org, repo, developer);

    return Ok(imageFileNames);
  }

  /// <summary>
  /// Endpoint for uploading image to application.
  /// </summary>
  /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
  /// <param name="repo">Application identifier which is unique within an organisation.</param>
  /// <param name="image">The actual image</param>
  [HttpPost]
  [ProducesResponseType(StatusCodes.Status200OK)]
  public async Task<ActionResult> UploadImage(string org, string repo, [FromForm(Name = "image")] IFormFile image)
  {
    if (image == null || image.Length == 0)
    {
      return BadRequest("No file uploaded.");
    }
    string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
    
    string imageName = GetFileNameFromUploadedFile(image);
    
    await _imagesService.UploadImage(org, repo, developer, imageName, image.OpenReadStream());
    
    return NoContent();
  }
  
  /// <summary>
  /// Endpoint for deleting image from application.
  /// </summary>
  /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
  /// <param name="repo">Application identifier which is unique within an organisation.</param>
  /// <param name="imageName">Name of image file to delete</param>
  [HttpDelete("{imageName}")]
  [ProducesResponseType(StatusCodes.Status200OK)]
  public async Task<ActionResult> DeleteImage(string org, string repo, string imageName)
  {
    string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
    
    await _imagesService.DeleteImage(org, repo, developer, imageName);

    return NoContent();
  }
  
  private static string GetFileNameFromUploadedFile(IFormFile image)
  {
    return ContentDispositionHeaderValue.Parse(new StringSegment(image.ContentDisposition)).FileName.ToString();
  }
  
}