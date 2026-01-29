using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Validation;
using Microsoft.AspNetCore.Mvc;
using ResourceType = Altinn.Studio.Designer.Enums.ResourceType;

namespace Altinn.Studio.Designer.Services.Implementation.Validation;

public class AltinnAppServiceResourceService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
    : IAltinnAppServiceResourceService
{
    public async Task<AltinnAppServiceResource> GenerateServiceResourceFromApp(
        string org,
        string repo,
        string developer
    )
    {
        AltinnAppGitRepository altinnAppGitRepository =
            altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        ApplicationMetadata applicationMetadata =
            await altinnAppGitRepository.GetApplicationMetadata();
        AltinnAppServiceResource serviceResource = applicationMetadata.ToServiceConfiguration();
        return serviceResource;
    }

    public (bool isValid, ValidationProblemDetails? errors) ValidateAltinnAppServiceResource(
        AltinnAppServiceResource altinnAppServiceResource
    )
    {
        ValidationContext validationContext = new(altinnAppServiceResource);
        ICollection<ValidationResult> validationResults = [];

        if (
            Validator.TryValidateObject(
                altinnAppServiceResource,
                validationContext,
                validationResults,
                true
            )
        )
        {
            return (true, null);
        }

        var errorMap = validationResults
            .SelectMany(r =>
                r.MemberNames.Select(m => new { Key = m, Error = r.ErrorMessage ?? string.Empty })
            )
            .GroupBy(x => x.Key)
            .ToDictionary(g => g.Key, g => g.Select(x => x.Error).ToArray());
        var validationProblemDetails = new ValidationProblemDetails(errorMap);
        return (false, validationProblemDetails);
    }
}

public static class ApplicationMetadataMapper
{
    public static AltinnAppServiceResource ToServiceConfiguration(
        this ApplicationMetadata applicationmetadata
    )
    {
        return new AltinnAppServiceResource
        {
            ResourceType = ResourceType.AltinnApp,
            Identifier = applicationmetadata?.Id,
            Title = applicationmetadata?.ServiceName?.ToServiceTranslatedString(),
            Description = applicationmetadata?.Description?.ToServiceTranslatedString(),
            ContactPoints = applicationmetadata?.ContactPoints?.ToServiceContactPoints(),
            RightDescription =
                applicationmetadata?.Access?.RightDescription?.ToServiceTranslatedString(),
            Delegable = applicationmetadata?.Access?.Delegable,
            AvailableForType = applicationmetadata?.Access?.AvailableForType,
        };
    }

    public static ServiceResourceTranslatedString ToServiceTranslatedString(
        this AppMetadataTranslatedString appMetadataTranslatedString
    )
    {
        return new ServiceResourceTranslatedString
        {
            Nb = appMetadataTranslatedString?.Nb,
            En = appMetadataTranslatedString?.En,
            Nn = appMetadataTranslatedString?.Nn,
            OtherLanguages = appMetadataTranslatedString?.OtherLanguages,
        };
    }

    public static List<ContactPoint> ToServiceContactPoints(
        this List<AppMetadataContactPoint> contactPoints
    )
    {
        return
        [
            .. contactPoints.Select(
                (point) =>
                    new ContactPoint
                    {
                        Category = point.Category,
                        Email = point.Email,
                        ContactPage = point.ContactPage,
                        Telephone = point.Telephone,
                    }
            ),
        ];
    }
}
