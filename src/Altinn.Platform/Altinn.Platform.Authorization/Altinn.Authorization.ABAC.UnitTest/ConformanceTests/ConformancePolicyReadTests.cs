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
                result = XacmlParser.ParseXacmlPolicy(reader);
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
        public void ParseXACMLRequest_IIA001Request()
        {
            XmlDocument policyDocument = new XmlDocument();

            policyDocument.Load(Path.Combine(GetConformanceTestPath(), "IIA001Request.xml"));

            XacmlContextRequest result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                result = XacmlParser.ReadContextRequest(reader);
            }

            Assert.NotNull(result);
        }

        [Fact]
        public void ParseXACMLPolicy_IID002Policy()
        {
            XmlDocument policyDocument = new XmlDocument();

            policyDocument.Load(Path.Combine(GetConformanceTestPath(), "IID002Policy.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                result = XacmlParser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Equal(4, result.Rules.Count);

            XacmlRule firstRule = result.Rules.Where(r => r.RuleId.Equals("urn:oasis:names:tc:xacml:2.0:conformance-test:IID002:rule1")).FirstOrDefault();
            Assert.NotNull(firstRule);
            Assert.Equal(XacmlEffectType.Deny, firstRule.Effect);
            Assert.Equal("A subject whose name is J. Hibbert may not\n            read Bart Simpson's medical record.  NOTAPPLICABLE", firstRule.Description.Trim());
            Assert.NotNull(firstRule.Target);
            Assert.Equal(1, firstRule.Target.AnyOf.Count);


        }


        [Fact]
        public void ParseXACMLPolicy_IIIA030Policy()
        {
            XmlDocument policyDocument = new XmlDocument();

            policyDocument.Load(Path.Combine(GetConformanceTestPath(), "IIIA030Policy.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                result = XacmlParser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Equal(2, result.Rules.Count);

            XacmlRule firstRule = result.Rules.Where(r => r.RuleId.Equals("urn:oasis:names:tc:xacml:2.0:conformance-test:IIIA030:rule1")).FirstOrDefault();
            Assert.NotNull(firstRule);
            Assert.Equal(XacmlEffectType.Deny, firstRule.Effect);
            Assert.Equal("A subject whose name is J. Hibbert may not\n            read Bart Simpson's medical record.  NOTAPPLICABLE", firstRule.Description.Trim());
            Assert.NotNull(firstRule.Target);
            Assert.Equal(1, firstRule.Target.AnyOf.Count);

            XacmlRule secondRule = result.Rules.Where(r => r.RuleId.Equals("urn:oasis:names:tc:xacml:2.0:conformance-test:IIIA030:rule2")).FirstOrDefault();
            Assert.NotNull(secondRule);
            Assert.Equal(XacmlEffectType.Permit, secondRule.Effect);
            Assert.Equal("A subject who is at least 5 years older than Bart\n            Simpson may read Bart Simpson's medical record. PERMIT.", secondRule.Description.Trim());
            Assert.Null(secondRule.Target);
        }





        [Fact]
        public void ParseXACMLPolicy_IIIE301Policy()
        {
            XmlDocument policyDocument = new XmlDocument();

            policyDocument.Load(Path.Combine(GetConformanceTestPath(), "IIIE301Policy.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                result = XacmlParser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Equal(1, result.Rules.Count);

            XacmlRule firstRule = result.Rules.Where(r => r.RuleId.Equals("urn:oasis:names:tc:xacml:2.0:conformance-test:IIIE301:rule")).FirstOrDefault();
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
                result = XacmlParser.ParseXacmlPolicy(reader);
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
