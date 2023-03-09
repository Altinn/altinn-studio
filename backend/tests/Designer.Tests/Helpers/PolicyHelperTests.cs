using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Authorization.ABAC.Utils;
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
        public void TestXacmlToJson_brg_rrh_innrapportering()
        {
            XacmlPolicy policy = AuthorizationUtil.ParsePolicy("brg_rrh-innrapportering.xml");
            ResourcePolicy convertedPolicy = PolicyConverter.ConvertPolicy(policy);
            Assert.NotNull(convertedPolicy);
            XacmlPolicy convertedBackPolicy = PolicyConverter.ConvertPolicy(convertedPolicy);
            AuthorizationUtil.WriteJsonPolicy("brg_rrh-innrapportering.json", convertedPolicy);
            AuthorizationUtil.WritePolicy("brg_rrh-innrapportering_converted.xml", convertedBackPolicy);
            AssertionUtil.AssertXacmlPolicy(policy, convertedBackPolicy);
        }

        [Fact]
        public void TestXacmlToJson_ssb_ra1000_01()
        {
            XacmlPolicy policy = AuthorizationUtil.ParsePolicy("ssb_ra1000-01.xml");
            ResourcePolicy convertedPolicy = PolicyConverter.ConvertPolicy(policy);
            Assert.NotNull(convertedPolicy);
            XacmlPolicy convertedBackPolicy = PolicyConverter.ConvertPolicy(convertedPolicy);
            AuthorizationUtil.WriteJsonPolicy("ssb_ra1000-01.json", convertedPolicy);
            AuthorizationUtil.WritePolicy("ssb_ra1000-01_converted.xml", convertedBackPolicy);
            AssertionUtil.AssertXacmlPolicy(policy, convertedBackPolicy);
        }

        [Fact]
        public void TestXacmlToJson_krt_krt_1012a_1()
        {
            XacmlPolicy policy = AuthorizationUtil.ParsePolicy("krt_krt-1012a-1.xml");
            ResourcePolicy convertedPolicy = PolicyConverter.ConvertPolicy(policy);
            Assert.NotNull(convertedPolicy);
            XacmlPolicy convertedBackPolicy = PolicyConverter.ConvertPolicy(convertedPolicy);
            AuthorizationUtil.WriteJsonPolicy("krt_krt-1012a-1.json", convertedPolicy);
            AuthorizationUtil.WritePolicy("krt_krt-1012a-1_converted.xml", convertedBackPolicy);
            AssertionUtil.AssertXacmlPolicy(policy, convertedBackPolicy);
        }

        [Fact]
        public void TestXacmlToJson_hmrhf_newsamhandlingsavik()
        {
            XacmlPolicy policy = AuthorizationUtil.ParsePolicy("hmrhf_newsamhandlingsavik.xml");
            ResourcePolicy convertedPolicy = PolicyConverter.ConvertPolicy(policy);
            Assert.NotNull(convertedPolicy);
            XacmlPolicy convertedBackPolicy = PolicyConverter.ConvertPolicy(convertedPolicy);
            AuthorizationUtil.WriteJsonPolicy("hmrhf_newsamhandlingsavik.json", convertedPolicy);
            AuthorizationUtil.WritePolicy("hmrhf_newsamhandlingsavik_converted.xml", convertedBackPolicy);
            AssertionUtil.AssertXacmlPolicy(policy, convertedBackPolicy);
        }

    }
}
