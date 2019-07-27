using Altinn.Authorization.ABAC.Xacml;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
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


        private static void AssertEqual(XacmlContextResult expected, XacmlContextResult actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expected);

            Assert.Equal(expected.Decision, actual.Decision);

        }
    }
}
