namespace Altinn.Studio.Designer.Models.Dto
{
    public class AccessListMemberDtoIdentifier
    {
        public string OrganizationNumber { get; set; }
    }

    public class AccessListMemberDto
    {
        public string Id { get; set; }
        public string Since { get; set; }
        public AccessListMemberDtoIdentifier Identifiers { get; set; }
    }
}
