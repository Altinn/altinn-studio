using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces.Validation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
[Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/validation")]
public class ValidationController(
    IAltinnAppServiceResourceService altinnAppServiceResourceService,
    ITaskDefaultDataTypeBindingValidator taskDefaultDataTypeBindingValidator
) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult> ValidateAltinnAppResource(string org, string app)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
        ServiceResource serviceResource = await altinnAppServiceResourceService.GenerateServiceResourceFromApp(
            org,
            app,
            developer
        );

        (bool isServiceResourceValid, ValidationProblemDetails? serviceResourceErrors) =
            altinnAppServiceResourceService.ValidateServiceResource(serviceResource);

        IReadOnlyDictionary<string, string[]> taskBindingErrors =
            await taskDefaultDataTypeBindingValidator.ValidateAsync(editingContext);

        Dictionary<string, string[]> mergedErrors = MergeValidationErrors(
            serviceResourceErrors?.Errors,
            taskBindingErrors
        );

        bool isValid = isServiceResourceValid && taskBindingErrors.Count == 0;

        return Ok(new { errors = mergedErrors, isValid });
    }

    private static Dictionary<string, string[]> MergeValidationErrors(
        IDictionary<string, string[]>? serviceResourceErrors,
        IReadOnlyDictionary<string, string[]> taskBindingErrors
    )
    {
        var merged = new Dictionary<string, string[]>(StringComparer.Ordinal);

        if (serviceResourceErrors != null)
        {
            foreach (KeyValuePair<string, string[]> entry in serviceResourceErrors)
            {
                merged[entry.Key] = entry.Value;
            }
        }

        foreach (KeyValuePair<string, string[]> entry in taskBindingErrors)
        {
            merged[entry.Key] = entry.Value;
        }

        return merged;
    }
}
