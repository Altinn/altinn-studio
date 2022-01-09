using Altinn.Platform.Authentication.Model;

using Xunit;

namespace Altinn.Platform.Authentication.Tests.Helpers
{
    /// <summary>
    /// Util class for assertion.
    /// </summary>
    public static class AdvancedAsserts
    {
        /// <summary>
        /// Asserts that two introspection responses as equal
        /// </summary>
        public static void Equal(IntrospectionResponse expected, IntrospectionResponse actual)
        {
            Assert.Equal(expected.Active, actual.Active);
            Assert.Equal(expected.Iss, actual.Iss);
        }
    }
}
