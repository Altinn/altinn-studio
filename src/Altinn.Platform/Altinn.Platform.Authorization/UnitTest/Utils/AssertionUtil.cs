using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;
using Altinn.Authorization.ABAC.Xacml;

using Xunit;

namespace Altinn.Authorization.ABAC.UnitTest.Utils
{
    public static class AssertionUtil
    {
        public static void AssertEqual(XacmlContextResponse expected, XacmlContextResponse actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);
            Assert.Equal(expected.Results.Count, actual.Results.Count);

            if (expected.Results.Count > 0)
            {
                AssertEqual(expected.Results.First(), actual.Results.First());
            }
        }

        public static void AssertPolicyEqual(XacmlPolicy expected, XacmlPolicy actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);
            Assert.Equal(expected.PolicyId, actual.PolicyId);
            Assert.Equal(expected.Version, actual.Version);
            Assert.Equal(expected.MaxDelegationDepth, actual.MaxDelegationDepth);
            Assert.Equal(expected.Description, actual.Description);
            Assert.Equal(expected.RuleCombiningAlgId.OriginalString, actual.RuleCombiningAlgId.OriginalString);

            if (expected.XPathVersion != null)
            {
                Assert.Equal(expected.XPathVersion.OriginalString, actual.XPathVersion.OriginalString);
            }

            AssertTargetEqual(expected.Target, actual.Target);

            AssertCollections(expected.Rules, actual.Rules, AssertRuleEqual);
        }

        private static void AssertEqual(XacmlContextResult expected, XacmlContextResult actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.Decision, actual.Decision);

            AssertEqual(expected.Status, actual.Status);

            Assert.Equal(expected.Obligations.Count, actual.Obligations.Count);

            if (expected.Obligations.Count > 0)
            {
                AssertEqual(expected.Obligations.First(), actual.Obligations.First());
            }
        }

        private static void AssertEqual(XacmlContextStatus expected, XacmlContextStatus actual)
        {
            if (expected != null)
            {
                Assert.NotNull(actual);
                Assert.Equal(expected.StatusCode.StatusCode, actual.StatusCode.StatusCode);
            }
        }

        private static void AssertEqual(XacmlObligation expected, XacmlObligation actual)
        {
            Assert.Equal(expected.FulfillOn, actual.FulfillOn);
            Assert.Equal(expected.ObligationId, actual.ObligationId);
            Assert.Equal(expected.AttributeAssignment.Count, expected.AttributeAssignment.Count);
            if (expected.AttributeAssignment.Count > 0)
            {
                AssertEqual(expected.AttributeAssignment.First(), actual.AttributeAssignment.First());
            }
        }

        private static void AssertEqual(XacmlAttributeAssignment expected, XacmlAttributeAssignment actual)
        {
            Assert.Equal(expected.Value, actual.Value);
            Assert.Equal(expected.Category, actual.Category);
            Assert.Equal(expected.AttributeId, actual.AttributeId);
            Assert.Equal(expected.DataType, actual.DataType);
        }

        private static void AssertTargetEqual(XacmlTarget expected, XacmlTarget actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
            }
            else
            {
                Assert.NotNull(actual);
                AssertCollections(expected.AnyOf, actual.AnyOf, AssertAnyOfEqual);
            }
        }

        private static void AssertRuleEqual(XacmlRule expected, XacmlRule actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.RuleId, actual.RuleId);
            AssertTargetEqual(expected.Target, actual.Target);

            AssertCollections(expected.Obligations, actual.Obligations, AssertObligationExpressionEqual);
        }

        private static void AssertAnyOfEqual(XacmlAnyOf expected, XacmlAnyOf actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            AssertCollections(expected.AllOf, actual.AllOf, AssertAllOfEqual);
        }

        private static void AssertAllOfEqual(XacmlAllOf expected, XacmlAllOf actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            AssertCollections(expected.Matches, actual.Matches, AssertMatchEqual);
        }

        private static void AssertMatchEqual(XacmlMatch expected, XacmlMatch actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.MatchId, actual.MatchId);
            AssertAttributeDesignatorEqual(expected.AttributeDesignator, actual.AttributeDesignator);
            AssertAttributeValueEqual(expected.AttributeValue, actual.AttributeValue);
        }

        private static void AssertAttributeValueEqual(XacmlAttributeValue expected, XacmlAttributeValue actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.DataType.OriginalString, actual.DataType.OriginalString);
            Assert.Equal(expected.Value, actual.Value);
            AssertCollections(expected.Attributes, actual.Attributes, AssertXAttributeEqual);
            AssertCollections(expected.Elements, actual.Elements, AssertXElementEqual);
        }

        private static void AssertAttributeDesignatorEqual(XacmlAttributeDesignator expected, XacmlAttributeDesignator actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.AttributeId.OriginalString, actual.AttributeId.OriginalString);
            Assert.Equal(expected.Category.OriginalString, actual.Category.OriginalString);
            Assert.Equal(expected.DataType.OriginalString, actual.DataType.OriginalString);
            Assert.Equal(expected.Issuer, actual.Issuer);
            Assert.Equal(expected.MustBePresent, actual.MustBePresent);
        }

        private static void AssertObligationExpressionEqual(XacmlObligationExpression expected, XacmlObligationExpression actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.ObligationId.OriginalString, actual.ObligationId.OriginalString);
            Assert.Equal(expected.FulfillOn, actual.FulfillOn);

            AssertCollections(expected.AttributeAssignmentExpressions, actual.AttributeAssignmentExpressions, AssertAttributeAssignmentExpressionEqual);
        }

        private static void AssertAttributeAssignmentExpressionEqual(XacmlAttributeAssignmentExpression expected, XacmlAttributeAssignmentExpression actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.AttributeId.OriginalString, actual.AttributeId.OriginalString);
            Assert.Equal(expected.Category.OriginalString, actual.Category.OriginalString);
            Assert.Equal(expected.Issuer, actual.Issuer);

            AssertAttributeValueEqual((XacmlAttributeValue)expected.Property, (XacmlAttributeValue)actual.Property);
        }

        private static void AssertXAttributeEqual(XAttribute expected, XAttribute actual)
        {
            Assert.Equal(expected.Name, actual.Name);
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void AssertXElementEqual(XElement expected, XElement actual)
        {
            Assert.Equal(expected.Name, actual.Name);
            Assert.Equal(expected.Value, actual.Value);
        }

        private static void AssertCollections<T>(ICollection<T> expected, ICollection<T> actual, Action<T, T> assertMethod)
        {
            Assert.Equal(expected.Count, actual.Count);

            Dictionary<int, T> expectedDict = new Dictionary<int, T>();
            Dictionary<int, T> actualDict = new Dictionary<int, T>();

            int i = 1;
            foreach (T ex in expected)
            {
                expectedDict.Add(i, ex);
                i++;
            }

            i = 1;
            foreach (T ac in actual)
            {
                actualDict.Add(i, ac);
                i++;
            }

            foreach (int key in expectedDict.Keys)
            {
                assertMethod(expectedDict[key], actualDict[key]);
            }
        }
    }
}
