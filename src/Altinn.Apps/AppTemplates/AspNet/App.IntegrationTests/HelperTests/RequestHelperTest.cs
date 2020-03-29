using Altinn.App.PlatformServices.Helpers;

using Xunit;

namespace App.IntegrationTestsRef.Platformservices
{
    public class RequestHelperTest
    {
        [Fact]
        public void RequestHelper_GetComplientContentHeader_FileNameAtEnd()
        {
            string expected = "attachment; filename=mellom%20rom.xml";
            string header = "attachment; filename=mellom rom.xml";
            string actual = RequestHelper.GetCompliantContentHeader(header);

            Assert.Equal(expected, actual);
        }

        [Fact]
        public void RequestHelper_GetComplientContentHeader_FileNameInMiddle()
        {
            string expected = "form-data; filename=file%20name.jpg; name=fieldName";
            string header = "form-data; filename=file name.jpg; name=fieldName";
            string actual = RequestHelper.GetCompliantContentHeader(header);

            Assert.Equal(expected, actual);
        }

        [Fact]
        public void RequestHelper_GetComplientContentHeader_NoFileName()
        {
            string expected = "form-data; name=fieldName";
            string header = "form-data; name=fieldName";
            string actual = RequestHelper.GetCompliantContentHeader(header);

            Assert.Equal(expected, actual);
        }
        
        [Fact]
        public void RequestHelper_GetComplientContentHeader_SpecialCharacter()
        {
            string expected = "attachment; filename=spesialt%C3%A6gn.txt";
            string header = "attachment; filename=spesialtægn.txt";
            string actual = RequestHelper.GetCompliantContentHeader(header);

            Assert.Equal(expected, actual);
        }

        
    }
}
