using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models.OrgAlertPerson;
using Altinn.Studio.Designer.Repository.Models.OrgAlertSlackChannel;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers.Organisation;

[ApiController]
[Authorize]
[Route("designer/api/{org}/alert-contact-points")]
public class OrgAlertContactPointsController(IOrgAlertContactPointsService service) : ControllerBase
{
    [HttpGet("persons")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IReadOnlyList<OrgAlertPersonResponse>>> GetPersons(
        string org,
        CancellationToken cancellationToken
    )
    {
        var entities = await service.GetPersonsAsync(org, cancellationToken);
        return Ok(entities.Select(MapToPersonResponse).ToList());
    }

    [HttpPost("persons")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<OrgAlertPersonResponse>> AddPerson(
        string org,
        [FromBody] OrgAlertPersonRequest request,
        CancellationToken cancellationToken
    )
    {
        var entity = MapToPersonEntity(org, request);
        var created = await service.AddPersonAsync(org, entity, cancellationToken);
        return CreatedAtAction(nameof(GetPersons), new { org }, MapToPersonResponse(created));
    }

    [HttpPut("persons/{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<OrgAlertPersonResponse>> UpdatePerson(
        string org,
        Guid id,
        [FromBody] OrgAlertPersonRequest request,
        CancellationToken cancellationToken
    )
    {
        var entity = MapToPersonEntity(org, request);
        var updated = await service.UpdatePersonAsync(org, id, entity, cancellationToken);
        return Ok(MapToPersonResponse(updated));
    }

    [HttpDelete("persons/{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> DeletePerson(string org, Guid id, CancellationToken cancellationToken)
    {
        await service.DeletePersonAsync(org, id, cancellationToken);
        return NoContent();
    }

    [HttpGet("slack-channels")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<IReadOnlyList<OrgAlertSlackChannelResponse>>> GetSlackChannels(
        string org,
        CancellationToken cancellationToken
    )
    {
        var entities = await service.GetSlackChannelsAsync(org, cancellationToken);
        return Ok(entities.Select(MapToSlackChannelResponse).ToList());
    }

    [HttpPost("slack-channels")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<OrgAlertSlackChannelResponse>> AddSlackChannel(
        string org,
        [FromBody] OrgAlertSlackChannelRequest request,
        CancellationToken cancellationToken
    )
    {
        var entity = MapToSlackChannelEntity(org, request);
        var created = await service.AddSlackChannelAsync(org, entity, cancellationToken);
        return CreatedAtAction(nameof(GetSlackChannels), new { org }, MapToSlackChannelResponse(created));
    }

    [HttpPut("slack-channels/{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<ActionResult<OrgAlertSlackChannelResponse>> UpdateSlackChannel(
        string org,
        Guid id,
        [FromBody] OrgAlertSlackChannelRequest request,
        CancellationToken cancellationToken
    )
    {
        var entity = MapToSlackChannelEntity(org, request);
        var updated = await service.UpdateSlackChannelAsync(org, id, entity, cancellationToken);
        return Ok(MapToSlackChannelResponse(updated));
    }

    [HttpDelete("slack-channels/{id:guid}")]
    [Authorize(Policy = AltinnPolicy.MustHaveOrganizationPermission)]
    public async Task<IActionResult> DeleteSlackChannel(string org, Guid id, CancellationToken cancellationToken)
    {
        await service.DeleteSlackChannelAsync(org, id, cancellationToken);
        return NoContent();
    }

    private static OrgAlertPersonEntity MapToPersonEntity(string org, OrgAlertPersonRequest request) =>
        new()
        {
            Org = org,
            Name = request.Name,
            Email = request.Email,
            EmailSeverity = request.EmailSeverity,
            Phone = request.Phone,
            SmsSeverity = request.SmsSeverity,
            IsActive = request.IsActive,
            Services = request.Services,
        };

    private static OrgAlertPersonResponse MapToPersonResponse(OrgAlertPersonEntity entity) =>
        new()
        {
            Id = entity.Id,
            Name = entity.Name,
            Email = entity.Email,
            EmailSeverity = entity.EmailSeverity,
            Phone = entity.Phone,
            SmsSeverity = entity.SmsSeverity,
            IsActive = entity.IsActive,
            Services = entity.Services,
        };

    private static OrgAlertSlackChannelEntity MapToSlackChannelEntity(
        string org,
        OrgAlertSlackChannelRequest request
    ) =>
        new()
        {
            Org = org,
            ChannelName = request.ChannelName,
            SlackId = request.SlackId,
            Severity = request.Severity,
            IsActive = request.IsActive,
            Services = request.Services,
        };

    private static OrgAlertSlackChannelResponse MapToSlackChannelResponse(OrgAlertSlackChannelEntity entity) =>
        new()
        {
            Id = entity.Id,
            ChannelName = entity.ChannelName,
            SlackId = entity.SlackId,
            Severity = entity.Severity,
            IsActive = entity.IsActive,
            Services = entity.Services,
        };
}
