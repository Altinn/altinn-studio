using Altinn.Platform.Register.Core;

using Xunit;

namespace Altinn.Platform.Register.Tests.UnitTests
{
    public class StringExtensionsTests
    {
        [Theory]
        [InlineData("fràe", "frae")]
        [InlineData("frãe", "frae")]
        [InlineData("REèb", "reeb")]
        [InlineData("ôröe", "Oroe")]
        public void IsSimilarTo_TestPositive(string text1, string text2)
        {
            Assert.True(text1.IsSimilarTo(text2));
        }

        [Theory]
        [InlineData("Åjue", "Ajue")]
        public void IsSimilarTo_TestNegative(string text1, string text2)
        {
            Assert.False(text1.IsSimilarTo(text2));
        }
    }
}
