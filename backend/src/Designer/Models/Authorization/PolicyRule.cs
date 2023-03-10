using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Authorization
{
    public class PolicyRule
    {
        public string RuleId { get; set; }

        public string Description { get; set; }

        public List<string> Subject { get; set; }

        public List<string> Actions { get; set; }

        public List<List<string>>  Resources { get; set; }
        
    }
}
