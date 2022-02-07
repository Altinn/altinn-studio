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
        public void IsSimilarTo_Test(string text1, string text2)
        {
            Assert.True(text1.IsSimilarTo(text2));
        }

        [Theory]
        [InlineData("fràe", "frae")]
        [InlineData("frãe", "frae")]
        [InlineData("REèb", "reeb")]
        public void LooseEquals_TestPositive(string text1, string text2)
        {
            Assert.True(text1.LooseEquals(text2));
        }

        [Theory]
        [InlineData("ôröe", "Oroe")]
        [InlineData("Åjue", "Ajue")]
        public void LooseEquals_TestNegative(string text1, string text2)
        {
            Assert.False(text1.LooseEquals(text2));
        }
    }
}
