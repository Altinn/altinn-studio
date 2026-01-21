using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Services.Interfaces.Validation
{
    public interface IAltinnAppServiceResourceService
    {
        Task<AltinnAppServiceResource> GenerateServiceResourceFromApp(
            string org,
            string repo,
            string developer
        );

        (bool isValid, ValidationProblemDetails? errors) ValidateAltinnAppServiceResource(
            AltinnAppServiceResource serviceResource
        );
    }
}
