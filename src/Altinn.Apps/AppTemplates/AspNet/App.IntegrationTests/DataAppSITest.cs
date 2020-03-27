using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Helpers;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

using Xunit;

namespace App.IntegrationTestsRef.Platformservices
{
    public class RequestHelperTest
    {
        [Fact]
        public void RequestHelper_GetComplientContentHeader_FileNameAtEnd()
        {
            string expected = "attachment; filename=mellom_rom.xml";
            string header = "attachment; filename=mellom rom.xml";
            string actual = RequestHelper.GetCompliantContentHeader(header);

            Assert.Equal(expected, actual);
        }

        [Fact]
        public void RequestHelper_GetComplientContentHeader_FileNameInMiddle()
        {
            string expected = "form-data; filename=file_name.jpg; name=fieldName";
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
    }
}
