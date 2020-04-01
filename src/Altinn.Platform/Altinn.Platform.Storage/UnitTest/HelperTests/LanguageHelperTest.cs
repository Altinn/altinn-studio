using System;
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
        [InlineData("xx", false)]
        [InlineData("tv", false)]
        public void IsTwoLetterISONameTest(string language, bool expected)
        {
            bool result = LanguageHelper.IsTwoLetterISOName(language);
            Assert.Equal(result, expected);
        }
    }
}
