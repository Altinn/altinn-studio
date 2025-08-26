namespace Altinn.Studio.PolicyAdmin.Models
{
    public class ResourcePolicy
    {
        public List<PolicyRule>? Rules { get; set; }

        public string? RequiredAuthenticationLevelEndUser { get; set; }

        public string? RequiredAuthenticationLevelOrg { get; set; }

        public string? Version { get; set; }
    }
}
