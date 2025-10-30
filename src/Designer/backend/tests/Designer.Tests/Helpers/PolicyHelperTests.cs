#nullable disable
using System;
using System.IO;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.PolicyAdmin;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class PolicyHelperTests : IDisposable
    {
        /// <summary>
        /// Used to remove the converted policy after the test is run
        /// </summary>
        private string _convertedXmlPolicyName;
        /// <summary>
        /// Used to remove the converted policy after the test is run
        /// </summary>
        private string _convertedJsonPolicyName;

        [Theory]
        [InlineData("brg_rrh-innrapportering.xml", "brg_rrh-innrapportering_converted.xml", "brg_rrh-innrapportering_converted.json")]
        [InlineData("ssb_ra1000-01.xml", "ssb_ra1000-01_converted.xml", "ssb_ra1000-01_converted.json")]
        [InlineData("krt_krt-1012a-1.xml", "krt_krt-1012a-1_converted.xml", "krt_krt-1012a-1_converted.json")]
        [InlineData("hmrhf_newsamhandlingsavik.xml", "hmrhf_newsamhandlingsavik_converted.xml", "hmrhf_newsamhandlingsavik_converted.json")]
        [InlineData("dsb_uhell_med_eksplosiver.xml", "dsb_uhell_med_eksplosiver_converted.xml", "dsb_uhell_med_eksplosiver_converted.json")]
        [InlineData("skd_sirius_skattemelding_sit_tk.xml", "skd_sirius_skattemelding_sit_tk_converted.xml", "skd_sirius_skattemelding_sit_tk_converted.json")]
        [InlineData("skd_mva-melding-innsending-v1.xml", "skd_mva-melding-innsending-v1_converted.xml", "skd_mva-melding-innsending-v1.json")]
        [InlineData("resource_registry_delegatableapi.xml", "resource_registry_delegatableapi_converted.xml", "resource_registry_delegatableapi.json")]
        public void TestXacmlToJson(string xmlPolicy, string convertedXamlPolicyName, string convertedJsonPolicyName)
        {
            _convertedJsonPolicyName = convertedJsonPolicyName;
            _convertedXmlPolicyName = convertedXamlPolicyName;

            XacmlPolicy policy = AuthorizationUtil.ParsePolicy(xmlPolicy);
            ResourcePolicy convertedPolicy = PolicyConverter.ConvertPolicy(policy);
            Assert.NotNull(convertedPolicy);
            XacmlPolicy convertedBackPolicy = PolicyConverter.ConvertPolicy(convertedPolicy);
            AuthorizationUtil.WriteJsonPolicy(convertedJsonPolicyName, convertedPolicy);
            AuthorizationUtil.WritePolicy(convertedXamlPolicyName, convertedBackPolicy);
            AssertionUtil.AssertXacmlPolicy(policy, convertedBackPolicy);
        }

        /// <summary>
        /// Checks if the converted policies are created on the file system and deletes them after the test is run
        /// </summary>
        public void Dispose()
        {
            string xmlPath = Path.Combine(AuthorizationUtil.GetPolicyPath(), _convertedXmlPolicyName);
            string jsonPath = Path.Combine(AuthorizationUtil.GetPolicyPath(), _convertedJsonPolicyName);
            if (File.Exists(xmlPath))
            {
                File.Delete(xmlPath);
            }

            if (File.Exists(jsonPath))
            {
                File.Delete(jsonPath);
            }
        }

    }
}
