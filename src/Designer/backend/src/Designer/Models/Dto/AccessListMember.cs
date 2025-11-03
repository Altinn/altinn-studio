using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class AccessListMembersDto
    {
        public required IList<AccessListMemberDataDto> Data { get; set; }
        public AccessListPaging? Links { get; set; }
    }

    public class AccessListMemberDataDto
    {
        public required string Id { get; set; }
        public required string Since { get; set; }
        public required AccessListMemberDtoIdentifier Identifiers { get; set; }
    }

    public class AccessListMemberDtoIdentifier
    {
        [JsonPropertyName("urn:altinn:party:uuid")]
        public required string PartyUuid { get; set; }
        [JsonPropertyName("urn:altinn:party:id")]
        public required int PartyId { get; set; }
        [JsonPropertyName("urn:altinn:organization:identifier-no")]
        public required string OrganizationNumber { get; set; }
    }

    public class UpdateAccessListMemberDto
    {
        public required IList<string> Data { get; set; }
    }


}
