using System.Collections.Generic;
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
    public async Task<ServiceResource> GenerateServiceResourceFromApp(
        string org,
        string repo,
        string developer
    )
    {
        AltinnAppGitRepository altinnAppGitRepository =
            altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, repo, developer);
        ApplicationMetadata applicationMetadata =
            await altinnAppGitRepository.GetApplicationMetadata();
        ServiceResource serviceResource = applicationMetadata.ToServiceResource();
        return serviceResource;
    }

    public (bool isValid, ValidationProblemDetails? errors) ValidateServiceResource(
        ServiceResource serviceResource
    )
    {
        var result = AltinnAppServiceResourceValidator.Validate(serviceResource);

        if (result.Errors.Count == 0)
        {
            return (true, null);
        }

        return (false, new ValidationProblemDetails(result.Errors));
    }
}

public static class AltinnAppServiceResourceValidator
{
    private const string Required = "REQUIRED";

    public static ValidationResult Validate(ServiceResource resource)
    {
        var errors = new Dictionary<string, List<string>>();

        if (string.IsNullOrEmpty(resource.Identifier))
        {
            AddError(errors, "identifier", Required);
        }

        if (resource.Title is null)
        {
            AddError(errors, "title", Required);
        }
        else
        {
            ValidateTranslatedString(errors, "title", resource.Title);
        }

        if (resource.Description is null)
        {
            AddError(errors, "description", Required);
        }
        else
        {
            ValidateTranslatedString(errors, "description", resource.Description);
        }

        if (resource.Delegable == true)
        {
            if (resource.RightDescription is null)
            {
                AddError(errors, "access.rightDescription", Required);
            }
            else
            {
                ValidateTranslatedString(
                    errors,
                    "access.rightDescription",
                    resource.RightDescription
                );
            }
        }

        if (resource.ContactPoints is null || resource.ContactPoints.Count == 0)
        {
            AddError(errors, "contactPoints", Required);
        }
        else
        {
            for (int i = 0; i < resource.ContactPoints.Count; i++)
            {
                ContactPoint contactPoint = resource.ContactPoints[i];
                if (
                    string.IsNullOrEmpty(contactPoint.Category)
                    && string.IsNullOrEmpty(contactPoint.Email)
                    && string.IsNullOrEmpty(contactPoint.Telephone)
                    && string.IsNullOrEmpty(contactPoint.ContactPage)
                )
                {
                    AddError(errors, $"contactPoints[{i}]", Required);
                }
            }
        }

        return new ValidationResult(errors.ToDictionary(k => k.Key, v => v.Value.ToArray()));
    }

    private static void ValidateTranslatedString(
        Dictionary<string, List<string>> errors,
        string fieldPrefix,
        Dictionary<string, string> translations
    )
    {
        if (!translations.TryGetValue("nb", out var nb) || string.IsNullOrEmpty(nb))
        {
            AddError(errors, $"{fieldPrefix}.nb", Required);
        }

        if (!translations.TryGetValue("nn", out var nn) || string.IsNullOrEmpty(nn))
        {
            AddError(errors, $"{fieldPrefix}.nn", Required);
        }

        if (!translations.TryGetValue("en", out var en) || string.IsNullOrEmpty(en))
        {
            AddError(errors, $"{fieldPrefix}.en", Required);
        }
    }

    private static void AddError(
        Dictionary<string, List<string>> errors,
        string key,
        string message
    )
    {
        if (!errors.TryGetValue(key, out var list))
        {
            list = [];
            errors[key] = list;
        }
        list.Add(message);
    }

    public record ValidationResult(Dictionary<string, string[]> Errors);
}

public static class ApplicationMetadataMapper
{
    public static ServiceResource ToServiceResource(this ApplicationMetadata applicationmetadata)
    {
        return new ServiceResource
        {
            ResourceType = ResourceType.AltinnApp,
            Identifier = applicationmetadata?.Id,
            Title = applicationmetadata?.Title?.ToDictionary(),
            Description = applicationmetadata?.Description?.ToDictionary(),
            ContactPoints = applicationmetadata?.ContactPoints?.ToServiceContactPoints(),
            RightDescription = applicationmetadata?.Access?.RightDescription?.ToDictionary(),
            Delegable = applicationmetadata?.Access?.Delegable,
            AvailableForType = applicationmetadata?.Access?.AvailableForType,
        };
    }

    public static Dictionary<string, string> ToDictionary(
        this AppMetadataTranslatedString appMetadataTranslatedString
    )
    {
        var dict = new Dictionary<string, string>();

        if (appMetadataTranslatedString?.Nb != null)
        {
            dict["nb"] = appMetadataTranslatedString.Nb;
        }

        if (appMetadataTranslatedString?.Nn != null)
        {
            dict["nn"] = appMetadataTranslatedString.Nn;
        }

        if (appMetadataTranslatedString?.En != null)
        {
            dict["en"] = appMetadataTranslatedString.En;
        }

        return dict;
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
