using System;
using System.IO;
using System.Linq;
using System.Xml;

using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;

using Xunit;

namespace Altinn.Authorization.ABAC.UnitTest.SpecExamplesTests
{
    public class SpecExamplesPolicyReadTests
    {
        [Fact]
        public void ParseXACMLPolicy_Rule1()
        {
            XmlDocument policyDocument = new XmlDocument();
           
            policyDocument.Load(Path.Combine(GetSpecExamplesTestPath(), "Rule1.xml"));

            XacmlPolicy result;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                result = XacmlParser.ParseXacmlPolicy(reader);
            }

            Assert.NotNull(result);
            Assert.Null(result.Description);
            Assert.Equal(1, result.Rules.Count);

            XacmlRule firstRule = result.Rules.Where(r => r.RuleId.Equals("urn:oasis:names:tc:xacml:3.0:example:ruleid:1")).FirstOrDefault();
            Assert.NotNull(firstRule);

            Assert.Equal(XacmlEffectType.Permit, firstRule.Effect);
            Assert.Equal("A person may read any medical record in the\n      http://www.med.example.com/schemas/record.xsd namespace\n      for which he or she is the designated patient", firstRule.Description.Trim());
            Assert.NotNull(firstRule.Target);

            Assert.Equal(2, firstRule.Target.AnyOf.Count);
        }
               
        private string GetSpecExamplesTestPath()
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(SpecExamplesPolicyReadTests).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Xacml\3.0\SpecExamples");
        }
    }
}
