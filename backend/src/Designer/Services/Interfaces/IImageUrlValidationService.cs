using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface IImageUrlValidationService
    {
        Task<ImageUrlValidationResult> ValidateRequestResponseAsync(string url);
    }
}
