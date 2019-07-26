using Altinn.Authorization.ABAC.Xacml;
using System;
using System.Collections.Generic;
using System.Text;
using Xunit;

namespace Altinn.Authorization.ABAC.UnitTest.Utils
{
    public static class AssertionUtil
    {
        public static void AssertEqual(XacmlContextResponse expexted, XacmlContextResponse actual)
        {
            Assert.NotNull(actual);
            Assert.NotNull(expexted);
            Assert.Equal(expexted.Results.Count, actual.Results.Count);
        }
    }
}
