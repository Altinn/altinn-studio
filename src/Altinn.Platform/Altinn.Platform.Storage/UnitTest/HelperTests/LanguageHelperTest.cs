using System;
using Altinn.Platform.Storage.Helpers;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest
{
    public class LanguageHelperTest
    {

        [Fact]
        public void IsTwoLetterISONameTest()
        {
            bool expectedTrue_1 = LanguageHelper.IsTwoLetterISOName("nb");
            bool expectedTrue_2 = LanguageHelper.IsTwoLetterISOName("en");
            bool expectedTrue_3 = LanguageHelper.IsTwoLetterISOName("de");

            bool expectedFalse_1 = LanguageHelper.IsTwoLetterISOName("xx");
            bool expectedFalse_2 = LanguageHelper.IsTwoLetterISOName("12");
            bool expectedFalse_3 = LanguageHelper.IsTwoLetterISOName("norsk");
            bool expectedFalse_4 = LanguageHelper.IsTwoLetterISOName("tv");

            Assert.Equal(expectedTrue_1, true);
            Assert.Equal(expectedTrue_2, true);
            Assert.Equal(expectedTrue_3, true);

            Assert.Equal(expectedFalse_1, false);
            Assert.Equal(expectedFalse_2, false);
            Assert.Equal(expectedFalse_3, false);
            Assert.Equal(expectedFalse_4, false);
        }
    }
}
