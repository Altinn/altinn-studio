# Phase 2: Backend Endpoints

## Objective

Create API endpoints that expose the bootstrap service:

1. Instance endpoint for stateful forms
2. Stateless endpoint for instanceless forms

---

## Tasks

### 2.1 Create Controller

**Location**: `src/Altinn.App.Api/Controllers/FormBootstrapController.cs`

```csharp
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.App;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

[AutoValidateAntiforgeryTokenIfAuthCookie]
[ApiController]
public class FormBootstrapController : ControllerBase
{
    private readonly IFormBootstrapService _formBootstrapService;
    private readonly IInstanceClient _instanceClient;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<FormBootstrapController> _logger;

    public FormBootstrapController(
        IFormBootstrapService formBootstrapService,
        IInstanceClient instanceClient,
        IAppResources appResources,
        IAppMetadata appMetadata,
        ILogger<FormBootstrapController> logger)
    {
        _formBootstrapService = formBootstrapService;
        _instanceClient = instanceClient;
        _appResources = appResources;
        _appMetadata = appMetadata;
        _logger = logger;
    }

    /// <summary>
    /// Gets all data needed to bootstrap a form for an instance.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    [ProducesResponseType(typeof(FormBootstrapResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Route("{org}/{app}/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}/bootstrap-form")]
    public async Task<ActionResult<FormBootstrapResponse>> GetInstanceFormBootstrap(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromQuery] string? layoutSetId = null,
        [FromQuery] string? dataElementId = null,
        [FromQuery] bool pdf = false,
        [FromQuery] string language = "nb",
        CancellationToken cancellationToken = default)
    {
        // Get instance
        var instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId, instanceGuid);
        if (instance == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Instance not found",
                Status = StatusCodes.Status404NotFound,
                Detail = $"Instance {instanceOwnerPartyId}/{instanceGuid} not found",
            });
        }

        // Validate subform parameters
        var subformValidation = ValidateSubformParameters(instance, layoutSetId, dataElementId);
        if (subformValidation != null)
        {
            return subformValidation;
        }

        try
        {
            var response = await _formBootstrapService.GetInstanceFormBootstrap(
                instance,
                layoutSetId,
                dataElementId,
                pdf,
                language,
                cancellationToken);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bootstrap form for instance {InstanceId}", $"{instanceOwnerPartyId}/{instanceGuid}");
            throw;
        }
    }

    /// <summary>
    /// Gets all data needed to bootstrap a stateless form.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(FormBootstrapResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Route("{org}/{app}/api/bootstrap-form/{layoutSetId}")]
    public async Task<ActionResult<FormBootstrapResponse>> GetStatelessFormBootstrap(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] string layoutSetId,
        [FromQuery] string language = "nb",
        CancellationToken cancellationToken = default)
    {
        // Validate layout set exists
        var validationResult = ValidateLayoutSetId(layoutSetId);
        if (validationResult != null)
        {
            return validationResult;
        }

        // Check if anonymous access is allowed
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            var isAnonymousAllowed = await IsAnonymousAllowedForLayoutSet(layoutSetId);
            if (!isAnonymousAllowed)
            {
                return Forbid();
            }
        }

        try
        {
            var response = await _formBootstrapService.GetStatelessFormBootstrap(
                layoutSetId,
                language,
                cancellationToken);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bootstrap stateless form for layout set {LayoutSetId}", layoutSetId);
            throw;
        }
    }

    private ActionResult? ValidateLayoutSetId(string layoutSetId)
    {
        var layoutSets = _appResources.GetLayoutSets();
        if (layoutSets?.Sets?.Any(s => s.Id == layoutSetId) != true)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Layout set not found",
                Status = StatusCodes.Status404NotFound,
                Detail = $"Layout set '{layoutSetId}' not found",
            });
        }
        return null;
    }

    private ActionResult? ValidateSubformParameters(
        Instance instance,
        string? layoutSetId,
        string? dataElementId)
    {
        // If neither provided, nothing to validate
        if (layoutSetId == null && dataElementId == null)
        {
            return null;
        }

        // Both must be provided together
        if (layoutSetId != null && dataElementId == null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Missing data element ID",
                Status = StatusCodes.Status400BadRequest,
                Detail = "When providing layoutSetId for a subform, dataElementId is also required.",
            });
        }

        if (dataElementId != null && layoutSetId == null)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Missing layout set ID",
                Status = StatusCodes.Status400BadRequest,
                Detail = "When providing dataElementId for a subform, layoutSetId is also required.",
            });
        }

        // Validate layout set exists
        var layoutSets = _appResources.GetLayoutSets();
        var layoutSet = layoutSets?.Sets?.FirstOrDefault(s => s.Id == layoutSetId);
        if (layoutSet == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Layout set not found",
                Status = StatusCodes.Status404NotFound,
                Detail = $"Layout set '{layoutSetId}' not found.",
            });
        }

        // Validate data element exists
        var dataElement = instance.Data.FirstOrDefault(d => d.Id == dataElementId);
        if (dataElement == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Data element not found",
                Status = StatusCodes.Status404NotFound,
                Detail = $"Data element '{dataElementId}' not found on instance.",
            });
        }

        // Validate data element type matches layout set's data type
        if (layoutSet.DataType != null && dataElement.DataType != layoutSet.DataType)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Data type mismatch",
                Status = StatusCodes.Status400BadRequest,
                Detail = $"Data element type '{dataElement.DataType}' does not match layout set data type '{layoutSet.DataType}'.",
            });
        }

        return null;
    }

    private async Task<bool> IsAnonymousAllowedForLayoutSet(string layoutSetId)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var layoutSets = _appResources.GetLayoutSets();
        var layoutSet = layoutSets?.Sets?.FirstOrDefault(s => s.Id == layoutSetId);

        if (layoutSet?.DataType == null)
        {
            return false;
        }

        var dataType = appMetadata.DataTypes.FirstOrDefault(dt => dt.Id == layoutSet.DataType);
        return dataType?.AppLogic?.AllowAnonymousOnStateless ?? false;
    }
}
```

---

### 2.2 Add Frontend URL Helpers

**Location**: `src/App/frontend/src/utils/urls/appUrlHelper.ts`

Add URL helpers for the new endpoints:

```typescript
export const getFormBootstrapUrl = (
  instanceId: string,
  options?: {
    layoutSetId?: string;
    dataElementId?: string;
    pdf?: boolean;
    language?: string;
  },
): string => {
  const params = new URLSearchParams();

  if (options?.layoutSetId) {
    params.set('layoutSetId', options.layoutSetId);
  }
  if (options?.dataElementId) {
    params.set('dataElementId', options.dataElementId);
  }
  if (options?.pdf) {
    params.set('pdf', 'true');
  }
  if (options?.language) {
    params.set('language', options.language);
  }

  const queryString = params.toString();
  return `${appPath}/instances/${instanceId}/bootstrap-form${queryString ? `?${queryString}` : ''}`;
};

export const getStatelessFormBootstrapUrl = (
  layoutSetId: string,
  options?: {
    language?: string;
  },
): string => {
  const params = new URLSearchParams();

  if (options?.language) {
    params.set('language', options.language);
  }

  const queryString = params.toString();
  return `${appPath}/api/bootstrap-form/${layoutSetId}${queryString ? `?${queryString}` : ''}`;
};
```

---

## Endpoint Summary

### Instance Mode

```
GET /{org}/{app}/instances/{partyId}/{guid}/bootstrap-form
```

| Parameter       | Location | Required | Description                          |
| --------------- | -------- | -------- | ------------------------------------ |
| `layoutSetId`   | Query    | No       | Override layout set (for subforms)   |
| `dataElementId` | Query    | No       | Specific data element (for subforms) |
| `pdf`           | Query    | No       | Skip validation for PDF generation   |
| `language`      | Query    | No       | Language code (default: nb)          |

**Authorization**: `POLICY_INSTANCE_READ`

### Stateless Mode

```
GET /{org}/{app}/api/bootstrap-form/{layoutSetId}
```

| Parameter     | Location | Required | Description                 |
| ------------- | -------- | -------- | --------------------------- |
| `layoutSetId` | Route    | Yes      | The layout set to load      |
| `language`    | Query    | No       | Language code (default: nb) |

**Authorization**: Anonymous if `AllowAnonymousOnStateless` is configured, otherwise authenticated.

---

## Acceptance Criteria

- [ ] Instance endpoint returns 200 with complete response
- [ ] Instance endpoint returns 404 for non-existent instance
- [ ] Instance endpoint returns 400 for invalid subform parameters
- [ ] Instance endpoint returns 403 for unauthorized users
- [ ] Stateless endpoint returns 200 with complete response
- [ ] Stateless endpoint returns 404 for non-existent layout set
- [ ] Stateless endpoint returns 403 when anonymous not allowed
- [ ] `pdf=true` skips validation in response
- [ ] Frontend URL helpers work correctly

---

## Notes

- Response is never cached at HTTP level (form data changes)
- Subform parameters must be provided together (both or neither)
- Stateless endpoint has no validation issues in response
