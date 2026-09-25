using System.Net.Mime;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.AccessManagement.Controllers;

/// <summary>
/// Emulates the Access Management end user API for listing the parties the authenticated user can act on behalf of.
/// The parties come from the same test data as <c>authorization/api/v1/parties</c>.
/// </summary>
[ApiController]
[Route("accessmanagement/api/v1/enduser/authorizedparties")]
public class AuthorizedPartiesController(IParties parties) : ControllerBase
{
    [HttpGet]
    [Authorize]
    [Produces(MediaTypeNames.Application.Json)]
    public async Task<ActionResult<AuthorizedPartiesResponseDto>> Get()
    {
        if (User.GetUserId() is not int userId)
        {
            return Unauthorized();
        }

        List<Party> partyList = await parties.GetParties(userId) ?? [];
        return Ok(new AuthorizedPartiesResponseDto(new AuthorizedPartiesLinksDto(null), partyList.Select(ToDto).ToList()));
    }

    private static AuthorizedPartyDto ToDto(Party party) =>
        new(
            PartyUuid: party.PartyUuid ?? Guid.Empty,
            PartyId: party.PartyId,
            Name: party.Name,
            OrganizationNumber: party.OrgNumber,
            PersonId: party.SSN,
            Type: party.PartyTypeName switch
            {
                PartyType.Person => "Person",
                PartyType.SelfIdentified => "SelfIdentified",
                PartyType.Organisation or PartyType.SubUnit or PartyType.BankruptcyEstate => "Organization",
                _ => "None",
            },
            UnitType: party.UnitType,
            IsDeleted: party.IsDeleted,
            OnlyHierarchyElementWithNoAccess: party.OnlyHierarchyElementWithNoAccess,
            AuthorizedAccessPackages: [],
            AuthorizedResources: [],
            AuthorizedRoles: [],
            AuthorizedInstances: [],
            Subunits: party.ChildParties?.Select(ToDto).ToList() ?? []
        );
}

public sealed record AuthorizedPartiesResponseDto(AuthorizedPartiesLinksDto Links, List<AuthorizedPartyDto> Data);

public sealed record AuthorizedPartiesLinksDto(string? Next);

public sealed record AuthorizedPartyDto(
    Guid PartyUuid,
    int PartyId,
    string? Name,
    string? OrganizationNumber,
    string? PersonId,
    string Type,
    string? UnitType,
    bool IsDeleted,
    bool OnlyHierarchyElementWithNoAccess,
    List<string> AuthorizedAccessPackages,
    List<string> AuthorizedResources,
    List<string> AuthorizedRoles,
    List<AuthorizedResourceInstanceDto> AuthorizedInstances,
    List<AuthorizedPartyDto> Subunits
);

public sealed record AuthorizedResourceInstanceDto(string ResourceId, string InstanceId);
