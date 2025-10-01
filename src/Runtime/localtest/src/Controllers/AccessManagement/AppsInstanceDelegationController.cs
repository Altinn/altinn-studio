#nullable enable
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json.Serialization;
using System.Buffers;
using System.Net.Mime;
using LocalTest.Services.AccessManagement;

namespace Altinn.AccessManagement.Controllers;

[ApiController]
[Route("accessmanagement/api")]
public class AppsInstanceDelegationController(LocalInstanceDelegationsRepository repository) : ControllerBase
{
    private readonly LocalInstanceDelegationsRepository _repository = repository;

    [HttpPost]
    [Route("v1/app/delegations/resource/{resourceId}/instance/{instanceId}")]
    [Consumes(MediaTypeNames.Application.Json)]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(AppsInstanceDelegationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(AppsInstanceDelegationResponseDto), StatusCodes.Status206PartialContent)]
    [ProducesResponseType(typeof(void), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(void), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult> Delegation([FromBody] AppsInstanceDelegationRequestDto appInstanceDelegationRequestDto, [FromRoute] string resourceId, [FromRoute] string instanceId, CancellationToken cancellationToken = default)
    {
        var delegation = new AppsInstanceDelegationResponseDto
        {
            From = appInstanceDelegationRequestDto.From,
            To = appInstanceDelegationRequestDto.To,
            ResourceId = resourceId,
            InstanceId = instanceId,
            Rights = appInstanceDelegationRequestDto.Rights.Select(r => new RightDelegationResultDto
            {
                Resource = r.Resource,
                Action = r.Action,
                Status = DelegationStatusExternal.Delegated
            }).ToArray()
        };

        await _repository.Save(delegation);

        return Ok(delegation);
    }

    [HttpPost]
    [Route("v1/app/delegationrevoke/resource/{resourceId}/instance/{instanceId}")]
    [Consumes(MediaTypeNames.Application.Json)]
    [Produces(MediaTypeNames.Application.Json)]
    [ProducesResponseType(typeof(AppsInstanceDelegationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(void), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(void), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public ActionResult Revoke([FromBody] AppsInstanceDelegationRequestDto appInstanceDelegationRequestDto, [FromRoute] string resourceId, [FromRoute] string instanceId, CancellationToken cancellationToken = default)
    {
        var delegation = new AppsInstanceDelegationResponseDto
        {
            From = appInstanceDelegationRequestDto.From,
            To = appInstanceDelegationRequestDto.To,
            ResourceId = resourceId,
            InstanceId = instanceId,
            Rights = appInstanceDelegationRequestDto.Rights.Select(r => new RightDelegationResultDto
            {
                Resource = r.Resource,
                Action = r.Action,
                Status = DelegationStatusExternal.Delegated
            }).ToArray()
        };

        _repository.Delete(delegation);
        return Ok(delegation);
    }
}

public sealed record UrnValue(string Type, string Value);

#nullable disable
public class AppsInstanceDelegationResponseDto
{
    /// <summary>
    /// Gets or sets the urn identifying the party to delegate from
    /// </summary>
    [Required]
    public UrnValue From { get; set; }

    /// <summary>
    /// Gets or sets the urn identifying the party to be delegated to
    /// </summary>
    [Required]
    public UrnValue To { get; set; }

    /// <summary>
    /// Gets or sets a value identifying the resource of the instance
    /// </summary>
    [Required]
    public string ResourceId { get; set; }

    /// <summary>
    /// Gets or sets a value identifying the instance id
    /// </summary>
    [Required]
    public string InstanceId { get; set; }

    /// <summary>
    /// Gets or sets the rights to delegate
    /// </summary>
    [Required]
    public IEnumerable<RightDelegationResultDto> Rights { get; set; }
}

public class RightDelegationResultDto
{
    /// <summary>
    /// Gets or sets the list of resource matches which uniquely identifies the resource this right applies to.
    /// </summary>
    public IEnumerable<UrnValue> Resource { get; set; }

    /// <summary>
    /// Gets or sets the set of Attribute Id and Attribute Value for a specific action, to identify the action this right applies to
    /// </summary>
    public UrnValue Action { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the right was successfully delegated or not
    /// </summary>
    public DelegationStatusExternal Status { get; set; }
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum DelegationStatusExternal
{
    /// <summary>
    /// Right was not delegated
    /// </summary>
    NotDelegated = 0,

    /// <summary>
    /// Right was delegated
    /// </summary>
    Delegated = 1
}
#nullable enable

public class AppsInstanceDelegationRequestDto
{
    /// <summary>
    /// Gets or sets the urn identifying the party to delegate from
    /// </summary>
    [Required]
    public required UrnValue From { get; set; }

    /// <summary>
    /// Gets or sets the urn identifying the party to be delegated to
    /// </summary>
    [Required]
    public required UrnValue To { get; set; }

    /// <summary>
    /// Gets or sets the rights to delegate
    /// </summary>
    [Required]
    public required IEnumerable<RightDto> Rights { get; set; }
}

public class RightDto
{
    #nullable disable
    /// <summary>
    /// Gets or sets the list of resource matches which uniquely identifies the resource this right applies to.
    /// </summary>
    public IEnumerable<UrnValue> Resource { get; set; }

    /// <summary>
    /// Gets or sets the set of Attribute Id and Attribute Value for a specific action, to identify the action this right applies to
    /// </summary>
    public UrnValue Action { get; set; }
    #nullable enable
}