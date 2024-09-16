using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class AccessListMembersDto
    {
        public IList<AccessListMemberDataDto> Data { get; set; }
        public AccessListPaging Links { get; set; }
    }

    public class AccessListMemberDataDto
    {
        public string Id { get; set; }
        public string Since { get; set; }
        public AccessListMemberDtoIdentifier Identifiers { get; set; }
    }

    public class AccessListMemberDtoIdentifier
    {
        [JsonPropertyName("urn:altinn:party:uuid")]
        public string PartyUuid { get; set; }
        [JsonPropertyName("urn:altinn:party:id")]
        public int PartyId { get; set; }
        [JsonPropertyName("urn:altinn:organization:identifier-no")]
        public string OrganizationNumber { get; set; }
    }

    public class UpdateAccessListMemberDto
    {
        public IList<string> Data { get; set; }
    }


}
