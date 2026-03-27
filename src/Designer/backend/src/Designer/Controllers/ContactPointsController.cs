using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Admin;

[ApiController]
[Authorize]
[Route("designer/api/v1/orgs/{org}/contact-points")]
public class ContactPointsController(IContactPointsService service) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IReadOnlyList<ContactPointResponse>>> GetContactPoints(
        string org,
        CancellationToken cancellationToken
    )
    {
        var contactPoints = await service.GetContactPointsAsync(org, cancellationToken);
        return Ok(contactPoints.Select(MapToResponse).ToList());
    }

    [HttpPost]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<ContactPointResponse>> AddContactPoint(
        string org,
        [FromBody] ContactPointRequest request,
        CancellationToken cancellationToken
    )
    {
        var created = await service.AddContactPointAsync(MapToDomain(request, org), cancellationToken);
        return CreatedAtAction(nameof(GetContactPoints), new { org }, MapToResponse(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<ContactPointResponse>> UpdateContactPoint(
        string org,
        Guid id,
        [FromBody] ContactPointRequest request,
        CancellationToken cancellationToken
    )
    {
        var updated = await service.UpdateContactPointAsync(MapToDomain(request, org, id), cancellationToken);
        return Ok(MapToResponse(updated));
    }

    [HttpPatch("{id:guid}/active")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> ToggleContactPointActive(
        string org,
        Guid id,
        [FromBody] ToggleActiveRequest request,
        CancellationToken cancellationToken
    )
    {
        await service.ToggleContactPointActiveAsync(org, id, request.IsActive, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> DeleteContactPoint(string org, Guid id, CancellationToken cancellationToken)
    {
        await service.DeleteContactPointAsync(org, id, cancellationToken);
        return NoContent();
    }

    private static ContactPoint MapToDomain(ContactPointRequest request, string org, Guid id = default) =>
        new()
        {
            Id = id,
            Org = org,
            Name = request.Name,
            IsActive = request.IsActive,
            Environments = request.Environments,
            Methods = request
                .Methods.Select(m => new ContactMethod { MethodType = m.MethodType, Value = m.Value })
                .ToList(),
        };

    private static ContactPointResponse MapToResponse(ContactPoint contactPoint) =>
        new()
        {
            Id = contactPoint.Id,
            Name = contactPoint.Name,
            IsActive = contactPoint.IsActive,
            Environments = contactPoint.Environments,
            Methods = contactPoint
                .Methods.Select(m => new ContactMethodResponse
                {
                    Id = m.Id,
                    MethodType = m.MethodType,
                    Value = m.Value,
                })
                .ToList(),
        };
}
