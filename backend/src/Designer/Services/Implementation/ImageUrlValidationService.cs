using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.ImageClient;

namespace Altinn.Studio.Designer.Services.Implementation;

public class ImageUrlValidationService : IImageUrlValidationService
{
    private readonly IUrlPolicyValidator _urlPolicyValidator;
    private readonly ImageClient _imageClient;

    public ImageUrlValidationService(IUrlPolicyValidator urlPolicyValidator, ImageClient imageClient)
    {
        _urlPolicyValidator = urlPolicyValidator;
        _imageClient = imageClient;
    }

    public async Task<ImageUrlValidationResult> ValidateUrlAsync(string url)
    {
        if (!_urlPolicyValidator.IsAllowed(url))
        {
            return ImageUrlValidationResult.NotValidImage;
        }

        return await _imageClient.ValidateRequestResponseAsync(url);
    }
}
