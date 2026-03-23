using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Admin;

[ApiController]
[Authorize]
[Route("designer/api/v1/admin/contact-points/{org}")]
public class ContactPointsController(IContactPointsService service) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IReadOnlyList<OrgContactPointResponse>>> GetContactPoints(
        string org,
        CancellationToken cancellationToken
    )
    {
        var entities = await service.GetContactPointsAsync(org, cancellationToken);
        return Ok(entities.Select(MapToResponse).ToList());
    }

    [HttpPost]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<OrgContactPointResponse>> AddContactPoint(
        string org,
        [FromBody] OrgContactPointRequest request,
        CancellationToken cancellationToken
    )
    {
        var entity = MapToEntity(org, request);
        var created = await service.AddContactPointAsync(org, entity, cancellationToken);
        return CreatedAtAction(nameof(GetContactPoints), new { org }, MapToResponse(created));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<OrgContactPointResponse>> UpdateContactPoint(
        string org,
        Guid id,
        [FromBody] OrgContactPointRequest request,
        CancellationToken cancellationToken
    )
    {
        var entity = MapToEntity(org, request);
        var updated = await service.UpdateContactPointAsync(org, id, entity, cancellationToken);
        return Ok(MapToResponse(updated));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> DeleteContactPoint(string org, Guid id, CancellationToken cancellationToken)
    {
        await service.DeleteContactPointAsync(org, id, cancellationToken);
        return NoContent();
    }

    private static ContactPointEntity MapToEntity(string org, OrgContactPointRequest request) =>
        new()
        {
            Org = org,
            Name = request.Name,
            IsActive = request.IsActive,
            Methods = request
                .Methods.Select(m => new ContactMethodEntity { MethodType = m.MethodType, Value = m.Value })
                .ToList(),
        };

    private static OrgContactPointResponse MapToResponse(ContactPointEntity entity) =>
        new()
        {
            Id = entity.Id,
            Name = entity.Name,
            IsActive = entity.IsActive,
            Methods = entity
                .Methods.Select(m => new ContactMethodResponse
                {
                    Id = m.Id,
                    MethodType = m.MethodType,
                    Value = m.Value,
                })
                .ToList(),
        };
}
