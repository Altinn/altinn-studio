using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Authorization
{
    public class PolicyRule
    {
        public List<RuleAction> Actions { get; set; }

        public List<RuleResource>  Resources { get; set; }

        public List<RuleSubject> Subject { get; set; }

        public string RuleId { get; set; }

        public string Description { get; set;  }

    }
}
