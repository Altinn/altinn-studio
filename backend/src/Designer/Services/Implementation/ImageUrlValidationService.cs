using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ImageUrlValidationService : IImageUrlValidationService
{
    private readonly IImageUrlPolicyValidator _imageUrlPolicyValidator;
    private readonly ImageClient _imageClient;

    public ImageUrlValidationService(IImageUrlPolicyValidator imageUrlPolicyValidator, ImageClient imageClient)
    {
        _imageUrlPolicyValidator = imageUrlPolicyValidator;
        _imageClient = imageClient;
    }

    public async Task<ImageUrlValidationResult> ValidateUrlFullyAsync(string url)
    {
        if (!_imageUrlPolicyValidator.IsAllowed(url))
        {
            return ImageUrlValidationResult.NotValidImage;
        }

        return await _imageClient.ValidateUrlAsync(url);
    }
}

