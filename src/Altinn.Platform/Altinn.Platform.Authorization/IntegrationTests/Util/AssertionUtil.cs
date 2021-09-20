using System.Collections.Generic;
using System.Linq;

using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Authorization.Models;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests.Util
{
    /// <summary>
    /// Class with methods that can help with assertions of larger objects.
    /// </summary>
    public static class AssertionUtil
    {
        /// <summary>
        /// Assert that two <see cref="XacmlContextResponse"/> have the same property values.
        /// </summary>
        /// <param name="expected">An instance with the expected values.</param>
        /// <param name="actual">The instance to verify.</param>
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
        
        /// <summary>
        /// Assert that two <see cref="XacmlJsonResponse"/> have the same property values.
        /// </summary>
        /// <param name="expected">An instance with the expected values.</param>
        /// <param name="actual">The instance to verify.</param>
        public static void AssertEqual(XacmlJsonResponse expected, XacmlJsonResponse actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);
            Assert.Equal(expected.Response.Count, actual.Response.Count);

            if (expected.Response.Count > 0)
            {
                for (int i = 0; i < expected.Response.Count(); i++)
                {
                    AssertEqual(expected.Response[i], actual.Response[i]);
                }
            }
        }
        
        /// <summary>
        /// Assert that two <see cref="XacmlContextRequest"/> have the same property values.
        /// </summary>
        /// <param name="expected">An instance with the expected values.</param>
        /// <param name="actual">The instance to verify.</param>
        public static void AssertEqual(XacmlContextRequest expected, XacmlContextRequest actual)
        {
            Assert.Equal(expected.Attributes.Count, actual.Attributes.Count);
            Assert.Equal(expected.GetResourceAttributes().Attributes.Count, actual.GetResourceAttributes().Attributes.Count);
            Assert.Equal(expected.GetSubjectAttributes().Attributes.Count, actual.GetSubjectAttributes().Attributes.Count);
            AssertEqual(expected.Attributes, actual.Attributes);
        }

        /// <summary>
        /// Assert that two lists of <see cref="ResourcePolicy"/> have the same property values.
        /// </summary>
        /// <param name="expected">An instance with the expected values.</param>
        /// <param name="actual">The instance to verify.</param>
        public static void AssertEqual(List<ResourcePolicy> expected, List<ResourcePolicy> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expected[i], actual[i]);
            }
        }

        private static void AssertEqual(XacmlJsonResult expected, XacmlJsonResult actual)
        {
            Assert.Equal(expected.Decision, actual.Decision);
            Assert.Equal(expected.Status.StatusCode.Value, actual.Status.StatusCode.Value);
            AssertEqual(expected.Obligations, actual.Obligations);
            AssertEqual(expected.Category, actual.Category);
        }

        private static void AssertEqual(List<XacmlJsonObligationOrAdvice> expected, List<XacmlJsonObligationOrAdvice> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.Equal(expected.Count, actual.Count);

            AssertEqual(expected.FirstOrDefault(), actual.FirstOrDefault());
        }

        private static void AssertEqual(List<XacmlJsonCategory> expected, List<XacmlJsonCategory> actual)
        {
            if(expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);

            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expected[i], actual[i]);
            }
        }

        private static void AssertEqual(XacmlJsonCategory expected, XacmlJsonCategory actual)
        {
            Assert.Equal(expected.CategoryId, actual.CategoryId);
            Assert.Equal(expected.Content, actual.Content);
            Assert.Equal(expected.Id, actual.Id);
            AssertEqual(expected.Attribute, actual.Attribute);
        }

        private static void AssertEqual(XacmlJsonObligationOrAdvice expected, XacmlJsonObligationOrAdvice actual)
        {
            Assert.Equal(expected.AttributeAssignment.Count, actual.AttributeAssignment.Count);

            AssertEqual(expected.AttributeAssignment.FirstOrDefault(), actual.AttributeAssignment.FirstOrDefault());
        }

        private static void AssertEqual(XacmlJsonAttributeAssignment expected, XacmlJsonAttributeAssignment actual)
        {
            Assert.Equal(expected.AttributeId, actual.AttributeId);
            Assert.Equal(expected.Category, actual.Category);
            Assert.Equal(expected.DataType, actual.DataType);
            Assert.Equal(expected.Issuer, actual.Issuer);
            Assert.Equal(expected.Value, actual.Value, true);
        }

        private static void AssertEqual(List<XacmlJsonAttribute> expected, List<XacmlJsonAttribute> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expected[i], actual[i]);
            }
        }

        private static void AssertEqual(XacmlJsonAttribute expected, XacmlJsonAttribute actual)
        {
            Assert.Equal(expected.AttributeId, actual.AttributeId);
            Assert.Equal(expected.DataType, actual.DataType);
            Assert.Equal(expected.IncludeInResult, actual.IncludeInResult);
            Assert.Equal(expected.Issuer, actual.Issuer);
            Assert.Equal(expected.Value, actual.Value, true);
        }

        private static void AssertEqual(XacmlContextResult expected, XacmlContextResult actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.Decision, actual.Decision);

            AssertEqual(expected.Status, actual.Status);

            AssertEqual(expected.Attributes, actual.Attributes);

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

        private static void AssertEqual(ICollection<XacmlContextAttributes> expected, ICollection<XacmlContextAttributes> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);
            Assert.Equal(expected.Count, actual.Count);

            List<XacmlContextAttributes> expectedList = expected.ToList();
            List<XacmlContextAttributes> actualList = actual.ToList();

            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expectedList[i], actualList[i]);
            }
        }

        private static void AssertEqual(XacmlContextAttributes expected, XacmlContextAttributes actual)
        {
            Assert.Equal(expected.Category.OriginalString, actual.Category.OriginalString);

            List<XacmlAttribute> expectedList = expected.Attributes.ToList();
            List<XacmlAttribute> actualList = actual.Attributes.ToList();

            for (int i = 0; i < expected.Attributes.Count; i++)
            {
                AssertEqual(expectedList[i], actualList[i]);
            }
        }

        private static void AssertEqual(XacmlAttribute expected, XacmlAttribute actual)
        {
            Assert.Equal(expected.AttributeId, actual.AttributeId);
            Assert.Equal(expected.IncludeInResult, actual.IncludeInResult);
            Assert.Equal(expected.Issuer, actual.Issuer);
            Assert.Equal(expected.AttributeValues.Count, actual.AttributeValues.Count);
            AssertEqual(expected.AttributeValues, actual.AttributeValues);
        }

        private static void AssertEqual(ICollection<XacmlAttributeValue> expected, ICollection<XacmlAttributeValue> actual)
        {
            List<XacmlAttributeValue> expectedList = expected.ToList();
            List<XacmlAttributeValue> actualList = actual.ToList();

            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expectedList[i], actualList[i]);
            }
        }

        private static void AssertEqual(XacmlAttributeValue expected, XacmlAttributeValue actual)
        {
            Assert.Equal(expected.DataType, actual.DataType);
            Assert.Equal(expected.Value, actual.Value, ignoreCase: true);
        }

        private static void AssertEqual(XacmlAttributeAssignment expected, XacmlAttributeAssignment actual)
        {
            Assert.Equal(expected.Value, actual.Value, ignoreCase: true);
            Assert.Equal(expected.Category, actual.Category);
            Assert.Equal(expected.AttributeId, actual.AttributeId);
            Assert.Equal(expected.DataType, actual.DataType);
        }

        public static void AssertEqual(ResourcePolicy expected, ResourcePolicy actual)
        {
            AssertEqual(expected.Title, actual.Title);
            AssertEqual(expected.Actions, actual.Actions);
            AssertEqual(expected.Resource, actual.Resource);
            if (expected.Description != null && actual.Description != null)
            {
                AssertEqual(expected.Description, actual.Description);
            }
        }

        public static void AssertEqual(LocalizedText expected, LocalizedText actual)
        {
            Assert.Equal(expected.NB, actual.NB);
            Assert.Equal(expected.NN, actual.NN);
            Assert.Equal(expected.EN, actual.EN);
        }

        private static void AssertEqual(List<ResourceAction> expected, List<ResourceAction> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expected[i], actual[i]);
            }
        }

        private static void AssertEqual(ResourceAction expected, ResourceAction actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.NotNull(actual);
            AssertEqual(expected.Title, actual.Title);
            AssertEqual(expected.Match, actual.Match);
            AssertEqual(expected.RoleGrants, actual.RoleGrants);

            if (expected.Description != null && actual.Description != null)
            {
                AssertEqual(expected.Description, actual.Description);
            }

        }

        private static void AssertEqual(List<RoleGrant> expected, List<RoleGrant> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expected[i], actual[i]);
            }
        }

        private static void AssertEqual(RoleGrant expected, RoleGrant actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.IsDelegable, actual.IsDelegable);
            Assert.Equal(expected.RoleTypeCode, actual.RoleTypeCode);
        }

        private static void AssertEqual(List<AttributeMatch> expected, List<AttributeMatch> actual)
        {
            if (expected == null)
            {
                Assert.Null(actual);
                return;
            }

            Assert.Equal(expected.Count, actual.Count);
            for (int i = 0; i < expected.Count; i++)
            {
                AssertEqual(expected[i], actual[i]);
            }
        }

        private static void AssertEqual(AttributeMatch expected, AttributeMatch actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.Id, actual.Id);
            Assert.Equal(expected.Value, actual.Value);
        }
    }
}
