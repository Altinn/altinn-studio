using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Xml;
using Xunit;

namespace Altinn.Authorization.ABAC.UnitTest.ConformanceTests
{
    public class ConformancePolicyReadTests
    {
        [Fact]
        public void ParseXACMLPolicy_IIA001Policy()
        {
            XmlDocument policyDocument = new XmlDocument();
           
            policyDocument.Load(Path.Combine(GetConformanceTestPath(), "IIA001Policy.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                result = Xacml30Parser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Equal("Policy for Conformance Test IIA001.", result.Description.Trim());
            Assert.Equal(1, result.Rules.Count);

            XacmlRule firstRule = result.Rules.Where(r => r.RuleId.Equals("urn:oasis:names:tc:xacml:2.0:conformance-test:IIA1:rule")).FirstOrDefault();
            Assert.NotNull(firstRule);

            Assert.Equal(XacmlEffectType.Permit, firstRule.Effect);
            Assert.Equal("Julius Hibbert can read or write Bart Simpson's medical record.", firstRule.Description.Trim());
            Assert.NotNull(firstRule.Target);

            Assert.Equal(3, firstRule.Target.AnyOf.Count);
        }


        [Fact]
        public void ParseXACMLPolicy_IIIF007Policy()
        {
            XmlDocument policyDocument = new XmlDocument();

            policyDocument.Load(Path.Combine(GetConformanceTestPath(), "IIIF007Policy.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                result = Xacml30Parser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Equal(1, result.Rules.Count);

            XacmlRule firstRule = result.Rules.Where(r => r.RuleId.Equals("urn:oasis:names:tc:xacml:2.0:conformance-test:IIIF007:rule")).FirstOrDefault();
            Assert.NotNull(firstRule);

            Assert.Equal(XacmlEffectType.Permit, firstRule.Effect);
            Assert.Equal("Julius Hibbert can read or write Bart Simpson's medical record.", firstRule.Description.Trim());
            Assert.NotNull(firstRule.Target);

            Assert.Equal(3, firstRule.Target.AnyOf.Count);
        }


        private string GetConformanceTestPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ConformancePolicyReadTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\ConformanceTests");
        }
    }
}
