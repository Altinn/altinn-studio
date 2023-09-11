using System.Collections.Generic;
using Altinn.Studio.PolicyAdmin.Constants;
using Altinn.Studio.PolicyAdmin.Models;

namespace Designer.Tests.Controllers.PolicyControllerTests
{
    public static class TestPolicyHelper
    {
        public static ResourcePolicy GenerateTestPolicy(string org, string app, string resourceid = null)
        {
            ResourcePolicy policy = new ResourcePolicy();

            policy.Rules = new List<PolicyRule>();

            PolicyRule rule1 = new PolicyRule();
            rule1.RuleId = "Policy1";
            rule1.Resources = new List<List<string>>();

            List<string> resourceSet1 = new List<string>();
            if (resourceid == null)
            {
                resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.OrgAttribute + ":" + org);
                resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.AppAttribute + ":" + app);
            }
            else
            {
                resourceSet1.Add(AltinnXacmlConstants.MatchAttributeIdentifiers.ResourceRegistryResource + ":" + resourceid);
            }

            rule1.Resources.Add(resourceSet1);

            rule1.Actions = new List<string>();
            rule1.Actions.Add("write");
            rule1.Actions.Add("read");
            rule1.Actions.Add("sign");

            policy.Rules.Add(rule1);

            return policy;
        }
    }
}
