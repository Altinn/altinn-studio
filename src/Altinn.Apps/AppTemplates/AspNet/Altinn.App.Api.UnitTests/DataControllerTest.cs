using Altinn.App.Api.Controllers;
using Altinn.App.Common.Interface;
using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Xunit;

namespace Altinn.App.Api.UnitTests
{
    public class DataControllerTest
    {
        private string org = "tdd";
        private string app = "dtst";
        private string partyId = "2222222";
        private int userId = 111111;

        private readonly Guid instanceGuid = Guid.Parse("4e416b68-32e5-47c3-bef8-4850d9d993b2");
        private readonly Guid dataGuid = Guid.Parse("16b62641-67b1-4cf0-b26f-61279fbf528d");

        [Fact]
        public void InitController()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                DataTypes = new List<DataType>
                {
                    new DataType
                    {
                        Id = "default",
                        AppLogic = new ApplicationLogic(),
                    },
                    new DataType
                    {
                        Id = "attachment",
                    }
                }
            };

            Instance instance = new Instance()
            {
                Id = $"{partyId}/{instanceGuid}",
                InstanceOwner = new InstanceOwner { PartyId = $"{partyId}" },
                AppId = $"{org}/{app}",
                Org = org,

                Data = new List<DataElement>()
                {
                    new DataElement()
                    {
                        Id = $"{dataGuid}",
                        DataType = "default",
                    }
                }
            };

            DataElement dataElement = new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                DataType = "attachment",
            };


            Mock<HttpRequest> request = MockRequest();            

            request.SetupGet(x => x.Body).Returns();
            request.SetupGet(x => x.ContentType).Returns("application/xml");

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(instance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
             .Setup(d => d.UpdateData(It.IsAny<object>(), instanceGuid, It.IsAny<Type>(), org, app, int.Parse(partyId), dataGuid))
             .Returns(Task.FromResult(dataElement));

            Mock<ILogger<DataController>> loggerMock = new Mock<ILogger<DataController>>();

            Mock<IAltinnApp> altinnAppMock = new Mock<IAltinnApp>();

            DataController controller = new DataController(loggerMock.Object, instanceServiceMock.Object, dataServiceMock.Object, appServiceMock.Object, altinnAppMock.Object);

        }

        private Mock<HttpRequest> MockRequest()
        {
            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.Host).Returns(new HostString($"{org}.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString($"/{org}/{app}/instances/"));
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns(partyId.ToString());
            return request;
        }
        private Mock<ClaimsPrincipal> MockUser()
        {
            string issuer = "https://altinn.no";
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.Integer, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "1", ClaimValueTypes.Integer, issuer));

            var userMock = new Mock<ClaimsPrincipal>();
            userMock.Setup(p => p.Claims).Returns(claims);
            return userMock;
        }
    }
}
