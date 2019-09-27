using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Authentication.Constants;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.RestControllers;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Storage.Interface.Models;
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Tests the process controller. The rest of runtime is mocked.
    /// </summary>
    public class ProcessControllerTest
    {
        private readonly string instanceOwnerId = "20000004";
        private readonly string userId = "44";
        private readonly string authenticationLevel = "1";
        private readonly string org = "test";
        private readonly string app = "app";
        private readonly Guid instanceGuid = Guid.Parse("878761d7-06d0-43ee-98c7-c85f7997d696");
        private readonly Guid dataGuid = Guid.Parse("16b62641-67b1-4cf0-b26f-61279fbf528d");

        private List<InstanceEvent> eventList = new List<InstanceEvent>();

        /// <summary>
        /// Check if process state returns null.
        /// </summary>
        [Fact]
        public void GetProcessStateOfInstanceWithoutProcessReturnsNull()
        {
            Mock<HttpContext> contextMock = MockContext();

            ProcessController processController = NewProcessController(contextMock, null);

            ActionResult<ProcessState> result = processController.GetProcessState(org, app, int.Parse(instanceOwnerId), instanceGuid).Result;

            ProcessState state = result.Value;

            Assert.Null(state);
        }

        /// <summary>
        /// Start process and check state
        /// </summary>
        [Fact]
        public void StartProcess()
        {
            ProcessController processController = NewProcessController(MockContext(), null);

            ActionResult<ProcessState> result = processController.StartProcess(org, app, int.Parse(instanceOwnerId), instanceGuid, null).Result;

            ProcessState state = (ProcessState)((OkObjectResult)result.Result).Value;

            Assert.NotNull(state);
            Assert.NotNull(state.Started);
            Assert.NotNull(state.CurrentTask);
            Assert.Equal("FormFilling_1", state.CurrentTask.ElementId);
        }

        /// <summary>
        /// Complete the process
        /// </summary>
        [Fact]
        public void CompleteProcess()
        {
            ProcessController processController = NewProcessController(MockContext(), null);

            ActionResult<ProcessState> result = processController.CompleteProcess(org, app, int.Parse(instanceOwnerId), instanceGuid).Result;

            ProcessState state = (ProcessState)((OkObjectResult)result.Result).Value;

            Assert.NotNull(state);
            Assert.NotNull(state.Started);
            Assert.Null(state.CurrentTask);
            Assert.Equal("EndEvent_1", state.EndEvent);
            Assert.NotNull(state.Ended);

            Assert.Equal(6, eventList.Count);
        }

        /// <summary>
        /// Next
        /// </summary>
        [Fact]
        public void Next()
        {
            ProcessState currentState = new ProcessState
            {
                Started = DateTime.Parse("2017-10-10T12:00:00.00Z"),
                CurrentTask = new ProcessElementInfo
                {
                    Started = DateTime.Parse("2017-10-10T12:01:01.00Z"),
                    ElementId = "FormFilling_1",
                    AltinnTaskType = "data",
                    Flow = 1,
                },                
            };

            ProcessController processController = NewProcessController(MockContext(), currentState);

            ActionResult<ProcessState> result = processController.NextElement(org, app, int.Parse(instanceOwnerId), instanceGuid, null).Result;

            ProcessState state = (ProcessState)((OkObjectResult)result.Result).Value;

            Assert.NotNull(state);

            Assert.Equal("Submit_1", state.CurrentTask.ElementId);
        }

        private Mock<HttpContext> MockContext()
        {
            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.Host).Returns(new HostString("tdd.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString("/tdd/test/instances/"));
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns(instanceOwnerId);

            Mock<HttpContext> contextMock = new Mock<HttpContext>();
            contextMock.SetupGet(x => x.Request).Returns(request.Object);
            contextMock.SetupGet(x => x.User).Returns(MockUser().Object);
            return contextMock;
        }

        private ProcessController NewProcessController(Mock<HttpContext> contextMock, ProcessState processState)
        {
            Instance instance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = $"{org}",
                Data = new List<DataElement>()
                {
                    new DataElement()
                    {
                        Id = dataGuid.ToString(),
                        ElementType = "default",
                    }
                },
                Process = processState,
            };

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(app, org, It.IsAny<int>(), instanceGuid))
                .Returns(Task.FromResult(instance));
            instanceServiceMock
                .Setup(i => i.UpdateInstance(It.IsAny<Instance>(), app, org, It.IsAny<int>(), instanceGuid))
                .Returns((Instance i, string app, string org, int ownerId, Guid instanceGuid) => Task.FromResult(i));

            Mock<IProcess> processServiceMock = new Mock<IProcess>();
            processServiceMock
                .Setup(p => p.GetProcessDefinition(org, app))
                .Returns(File.OpenRead("Runtime/data/workflow.bpmn"));

            Mock<IInstanceEvent> eventServiceMock = new Mock<IInstanceEvent>();
            eventServiceMock
                .Setup(e => e.SaveInstanceEvent(It.IsAny<InstanceEvent>(), org, app))
                .Callback((object e, string org, string app) =>
                {
                    eventList.Add(e as InstanceEvent);
                })
                .Returns(Task.FromResult("EventId"));

            Mock<IRegister> registerServiceMock = new Mock<IRegister>();
            registerServiceMock
                .Setup(x => x.GetParty(It.IsAny<int>()))
                .Returns(Task.FromResult(new Party() { PartyId = int.Parse(instanceOwnerId) }));

            Mock<IProfile> profileServiceMock = new Mock<IProfile>();
            profileServiceMock
                .Setup(x => x.GetUserProfile(It.IsAny<int>()))
                .Returns(Task.FromResult(new UserProfile() { UserId = int.Parse(userId) }));

            Mock<IOptions<GeneralSettings>> generalSettingsMock = new Mock<IOptions<GeneralSettings>>();
            generalSettingsMock.Setup(s => s.Value).Returns(new GeneralSettings()
            {
                AltinnPartyCookieName = "AltinnPartyId",
            });         

            return new ProcessController(
                new Mock<ILogger<ProcessController>>().Object,
                instanceServiceMock.Object,
                processServiceMock.Object,
                eventServiceMock.Object,
                profileServiceMock.Object,
                registerServiceMock.Object,
                generalSettingsMock.Object)
            {
                ControllerContext = new ControllerContext()
                {
                    HttpContext = contextMock.Object,
                }
            };
        }

        private Mock<ClaimsPrincipal> MockUser()
        {
            string issuer = "https://altinn.no";
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId, ClaimValueTypes.Integer, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, authenticationLevel, ClaimValueTypes.Integer, issuer));

            var userMock = new Mock<ClaimsPrincipal>();
            userMock.Setup(p => p.Claims).Returns(claims);
            return userMock;
        }
    }
}
