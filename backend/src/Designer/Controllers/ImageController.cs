using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Web;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
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
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/images")]
public class ImageController : ControllerBase
{
    private readonly IImagesService _imagesService;
    private readonly IImageUrlValidationService _imageUrlValidationService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ImageController"/> class.
    /// </summary>
    /// <param name="imagesService">The images service.</param>
    /// <param name="imageUrlValidationService"></param>
    public ImageController(IImagesService imagesService,
        IImageUrlValidationService imageUrlValidationService)
    {
        _imagesService = imagesService;
        _imageUrlValidationService = imageUrlValidationService;
    }

    /// <summary>
    /// Endpoint for getting a specific image
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="encodedImagePath">Relative encoded path of image to fetch</param>
    /// <returns>Image</returns>
    [HttpGet("{encodedImagePath}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public FileStreamResult GetImageByName(string org, string app, [FromRoute] string encodedImagePath)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string decodedImagePath = HttpUtility.UrlDecode(encodedImagePath);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

        return _imagesService.GetImage(editingContext, decodedImagePath);
    }

    /// <summary>
    /// Endpoint for getting all image file names in application
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <returns>All image file names</returns>
    [HttpGet("fileNames")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<List<string>> GetAllImagesFileNames(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

        List<string> imageFileNames = _imagesService.GetAllImageFileNames(editingContext);

        return Ok(imageFileNames);
    }

    /// <summary>
    /// Endpoint to validate a given url for fetching an external image.
    /// </summary>
    /// <param name="url">An external url to fetch an image to represent in the image component in the form.</param>
    /// <returns>NotAnImage if url does not point at an image or NotValidUrl if url is invalid for any other reason</returns>
    [HttpGet("validate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> ValidateExternalImageUrl([FromQuery] string url)
    {
        ImageUrlValidationResult imageUrlValidationResult =
            await _imageUrlValidationService.ValidateRequestResponseAsync(url);

        if (imageUrlValidationResult == ImageUrlValidationResult.NotValidImage)
        {
            return UnprocessableEntity(ImageUrlValidationResult.NotValidImage);
        }

        return Ok(ImageUrlValidationResult.Ok);
    }

    /// <summary>
    /// Endpoint for uploading image to application.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="image">The actual image</param>
    /// <param name="overrideExisting">Optional parameter that overrides existing image if set. Default is false</param>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> UploadImage(string org, string app, [FromForm(Name = "file")] IFormFile image,
        [FromForm(Name = "overrideExisting")] bool overrideExisting = false)
    {
        if (image == null || image.Length == 0)
        {
            return BadRequest("No file uploaded.");
        }

        if (!IsValidImageContentType(image.ContentType))
        {
            throw new InvalidExtensionImageUploadException("The uploaded file is not a valid image.");
        }

        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

        string imageName = GetFileNameFromUploadedFile(image);
        try
        {
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            await _imagesService.UploadImage(editingContext, imageName, image.OpenReadStream(), overrideExisting);
            return NoContent();
        }
        catch (InvalidOperationException e)
        {
            return BadRequest(e.Message);
        }
    }

    /// <summary>
    /// Endpoint for deleting image from application.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="encodedImagePath">Relative encoded path of image to delete</param>
    [HttpDelete("{encodedImagePath}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> DeleteImage(string org, string app, [FromRoute] string encodedImagePath)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string decodedImagePath = HttpUtility.UrlDecode(encodedImagePath);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

        await _imagesService.DeleteImage(editingContext, decodedImagePath);

        return NoContent();
    }

    private static string GetFileNameFromUploadedFile(IFormFile image)
    {
        return ContentDispositionHeaderValue.Parse(new StringSegment(image.ContentDisposition)).FileName.ToString();
    }

    private bool IsValidImageContentType(string contentType)
    {
        return contentType.ToLower().StartsWith("image/");
    }
}
