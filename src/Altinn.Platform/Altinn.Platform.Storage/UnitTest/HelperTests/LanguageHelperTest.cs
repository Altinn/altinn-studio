using Altinn.Platform.Storage.Helpers;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest
{
    public class LanguageHelperTest
    {
        [Theory]
        [InlineData("nb", true)]
        [InlineData("en", true)]
        [InlineData("de", true)]
        [InlineData("12", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        [InlineData("norsk", false)]
        [InlineData("t1", false)]
        public void IsTwoLetterTest(string language, bool expected)
        {
            bool result = LanguageHelper.IsTwoLetters(language);
            Assert.Equal(expected, result);
        }
    }
}
