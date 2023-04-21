using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Authorization
{
    public class ResourcePolicy
    {
        public List<PolicyRule> Rules { get; set; }

        public List<PolicyObligation> Obligations { get; set; }

        public string RequiredAuthenticationLevelEndUser { get; set; }
    }
}
