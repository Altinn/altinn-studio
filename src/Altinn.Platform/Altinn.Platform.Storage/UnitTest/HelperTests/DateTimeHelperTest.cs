using System;
using Altinn.Platform.Storage.Helpers;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest
{
    public class DateTimeHelperTest
    {
        [Fact]
        public void ParseDateTest()
        {
            DateTime date = DateTimeHelper.ParseAndConvertToUniversalTime("2017-01-01");

            Assert.Equal(DateTimeKind.Utc, date.Kind);           
        }

        [Fact]
        public void ParseDateTime()
        {
            string inputDateTime = "2017-01-01T00:00:00";
            DateTime date = DateTimeHelper.ParseAndConvertToUniversalTime(inputDateTime);

            Assert.Equal(DateTimeKind.Utc, date.Kind);
            Assert.StartsWith(inputDateTime, DateTimeHelper.RepresentAsIso8601Utc(date));
        }

        [Fact]
        public void ParseDateTimeWithTimezone()
        {
            DateTime date = DateTimeHelper.ParseAndConvertToUniversalTime("2017-01-01T00:00:00+01");

            Assert.Equal(DateTimeKind.Utc, date.Kind);
        }
    }
}
