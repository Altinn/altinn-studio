using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models.Authorization;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class PolicyHelperTests
    {

        [Fact]
        public void TestXacmlToJson_RRH()
        {
            XacmlPolicy policy = AuthorizationUtil.ParsePolicy("brg_rrh-innrapportering.xml");
            ResourcePolicy convertedPolicy = PolicyConverter.ConvertPolicy(policy);
            Assert.NotNull(convertedPolicy);
            XacmlPolicy convertedBackPolicy = PolicyConverter.ConvertPolicy(convertedPolicy);
            Assert.Equal(policy.Rules.Count, convertedBackPolicy.Rules.Count);
            AssertionUtil.AssertCollections(policy.Rules, convertedBackPolicy.Rules, AssertionUtil.AssertXacmlRulesEqual);
        }


    }
}
