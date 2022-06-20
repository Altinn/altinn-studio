#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using AltinnCore.Authentication.Constants;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest.TestingControllers;

public class InstancesControllerGETTests
{
    private readonly Mock<IInstanceRepository> _instanceRepository = new Mock<IInstanceRepository>();
    private readonly Mock<IInstanceEventRepository> _instanceEventRepository = new Mock<IInstanceEventRepository>();
    private readonly Mock<IApplicationRepository> _applicationRepository = new Mock<IApplicationRepository>();
    private readonly Mock<IPartiesWithInstancesClient> _partiesWithInstancesClient = new Mock<IPartiesWithInstancesClient>();
    private readonly Mock<ILogger<InstancesController>> _logger = new Mock<ILogger<InstancesController>>();
    private readonly Mock<ILogger<AuthorizationHelper>> _authzLogger = new Mock<ILogger<AuthorizationHelper>>();
    private readonly Mock<IPDP> _pdp = new Mock<IPDP>();
    private readonly Mock<IOptions<GeneralSettings>> _generalSettings = new Mock<IOptions<GeneralSettings>>();
    private readonly Mock<HttpContext> _httpContext = new Mock<HttpContext>();
    private readonly Mock<RouteData> _routeData = new Mock<RouteData>();
    private readonly Mock<ModelStateDictionary> _modelState = new Mock<ModelStateDictionary>();
    private readonly ControllerContext _controllerContext;
    private readonly ActionContext _actionContext;

    private readonly InstancesController _controller;

    public InstancesControllerGETTests()
    {
        _generalSettings.Setup(gs => gs.Value).Returns(new GeneralSettings { Hostname = "testHostName", InstanceReadScope = new List<string> { "altinn:serviceowner/instances.read" } });
        _actionContext = new ActionContext(_httpContext.Object, _routeData.Object, new ControllerActionDescriptor(), _modelState.Object);
        _controllerContext = new ControllerContext(_actionContext);
        _controller = new InstancesController(_instanceRepository.Object, _instanceEventRepository.Object, _applicationRepository.Object, _partiesWithInstancesClient.Object, _logger.Object, _authzLogger.Object, _pdp.Object, _generalSettings.Object);
        _controller.ControllerContext = _controllerContext;
        _httpContext.Setup(hc => hc.Request.Path).Returns("/requestPath");
    }

    private void SetUserClaims(System.Security.Claims.Claim[] claims)
    {
        _httpContext.Setup(hc => hc.User).Returns(() => new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(claims, "AuthenticationTypes.Federation")));
    }

    // No Auth
    [Fact]
    public async Task NoAuth_NoQuery_ForbidResult()
    {
        _httpContext.Setup(hc => hc.User.HasClaim(It.IsAny<Predicate<System.Security.Claims.Claim>>())).Returns(false);
        await RunTestCase(new()
        {
            ResultType = typeof(ForbidResult),
        });
    }

    // Auth Org
    [Fact]
    public async Task AuthOrg_AllOrgInstances_ReturnsOk() =>
        await RunTestCase(new()
        {
            AuthOrg = "tdd",
            Org = "tdd",
            ResultType = typeof(OkObjectResult),
            QueryLength = 1,
        });

    [Fact]
    public async Task AuthOrg_NoOrgInQuery_ReturnsBadRequest() =>
        await RunTestCase(new()
        {
            AuthOrg = "tdd",
            ResultType = typeof(BadRequestObjectResult),
        });

    [Fact]
    public async Task AuthOrg_WrongAppIdFormat_ReturnsBadRequest() =>
        await RunTestCase(new()
        {
            AuthOrg = "tdd",
            Org = "tdd",
            AppId = "krt-krt-1334",
            ResultType = typeof(BadRequestObjectResult),
            QueryLength = -1,
        });

    [Fact]
    public async Task AuthOrg_OrgMissmatchAppId_ReturnsBadRequest() =>
        await RunTestCase(new()
        {
            AuthOrg = "tdd",
            Org = "tdd",
            AppId = "krt/krt-krt1334", // Does not match Org
            ResultType = typeof(BadRequestObjectResult)
        });

    [Fact]
    public async Task AuthOrg_AllAppInstancesWithOrg_ReturnsOk() =>
        await RunTestCase(new()
        {
            AuthOrg = "tdd",
            Org = "tdd",
            AppId = "tdd/krt-krt1334",
            ResultType = typeof(OkObjectResult),
            QueryLength = 2,
        });

    [Fact]
    public async Task AuthOrg_AllAppInstancesWithoutOrg_ReturnsOk() =>
        await RunTestCase(new()
        {
            AuthOrg = "tdd",
            AppId = "tdd/krt-krt1334",
            ResultType = typeof(OkObjectResult),
            QueryLength = 2,
        });

    [Fact]
    public async Task AuthUser_NoPartyId_ReturnsBadRequest() =>
        await RunTestCase(new()
        {
            AuthUserId = "3566",
            ResultType = typeof(BadRequestObjectResult),
        });

    [Fact]
    public async Task AuthUser_WithPartyId_ReturnsOk() =>
        await RunTestCase(new()
        {
            AuthUserId = "3566",
            InstanceOwnerPartyId = 3566,
            ResultType = typeof(OkObjectResult),
            QueryLength = 2,
        });

    [Fact]
    public async Task AuthUser_Org_ReturnsOk() =>
        await RunTestCase(new()
        {
            AuthUserId = "3566",
            Org = "tdd",
            InstanceOwnerPartyId = 3566,
            ResultType = typeof(OkObjectResult),
            QueryLength = 3,
        });

    [Fact]
    public async Task AuthUser_InvalidAppID_ReturnsBad() =>
        await RunTestCase(new()
        {
            AuthUserId = "3566",
            AppId = "tdd",
            InstanceOwnerPartyId = 3566,
            ResultType = typeof(BadRequestObjectResult),
        });

    [Fact]
    public async Task AuthUser_OrgFromAppId_ReturnsOk() =>
        await RunTestCase(new()
        {
            AuthUserId = "3566",
            AppId = "tdd/test-1234",
            InstanceOwnerPartyId = 3566,
            ResultType = typeof(OkObjectResult),
            QueryLength = 4,
        });

    [Fact]
    public async Task AuthUser_OrgFromAppIdMissmatch_ReturnsBadResult() =>
        await RunTestCase(new()
        {
            AuthUserId = "3566",
            Org = "krt",
            AppId = "tdd/test-1234",
            InstanceOwnerPartyId = 3566,
            ResultType = typeof(BadRequestObjectResult),
        });

    private async Task RunTestCase(TestCase testCase)
    {
        if (testCase.AuthOrg != null)
        {
            SetUserClaims(new System.Security.Claims.Claim[]
            {
                    new(AltinnCoreClaimTypes.Org, testCase.AuthOrg),
                    new("urn:altinn:scope", _generalSettings.Object.Value.InstanceReadScope[0])
            });
        }
        else if (testCase.AuthUserId != null)
        {
            SetUserClaims(new System.Security.Claims.Claim[]
            {
                    new(AltinnCoreClaimTypes.UserId, testCase.AuthUserId),
            });
        }

        var instances = new List<Instance>
            {
                new()
                {
                    Id = $"{testCase.InstanceOwnerPartyId ?? 12345}/{Guid.NewGuid()}",
                    AppId = "krt/krt-1228a-1",
                    Org = "krt",
                    InstanceOwner = new()
                    {
                        PartyId = (testCase.InstanceOwnerPartyId ?? 12345).ToString(),
                    }
                }
            };
        _instanceRepository
            .Setup(ir => ir.GetInstancesFromQuery(It.IsAny<Dictionary<string, Microsoft.Extensions.Primitives.StringValues>>(), It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new InstanceQueryResponse() { Instances = instances });
        _pdp
            .Setup(pdp => pdp.GetDecisionForRequest(It.IsAny<XacmlJsonRequestRoot>()))
            .ReturnsAsync(new XacmlJsonResponse()
            {
                Response = new()
                {
                        new()
                        {
                            Category = new()
                            {
                                new()
                                {
                                    Attribute = new()
                                    {
                                        new()
                                        {
                                            // AttributeId = Altinn.Common.PEP.ConstantsAltinnXacmlUrns.InstanceId
                                            AttributeId = "urn:altinn:instance-id",
                                            Value = instances.First().Id,
                                        }
                                    },
                                }
                            },
                            Decision = "Permit",
                        }
                }
            });

        var res = await _controller.GetInstances(
                org: testCase.Org,
                appId: testCase.AppId,
                currentTaskId: testCase.CurrentTaskId,
                processIsComplete: testCase.ProcessIsComplete,
                processEndEvent: testCase.ProcessEndEvent,
                processEnded: testCase.ProcessEnded,
                instanceOwnerPartyId: testCase.InstanceOwnerPartyId,
                lastChanged: testCase.LastChanged,
                created: testCase.Created,
                visibleAfter: testCase.VisibleAfter,
                dueBefore: testCase.DueBefore,
                excludeConfirmedBy: testCase.ExcludeConfirmedBy,
                isSoftDeleted: testCase.IsSoftDeleted,
                isHardDeleted: testCase.IsHardDeleted,
                isArchived: testCase.IsArchived,
                continuationToken: testCase.ContinuationToken,
                size: testCase.Size);
        Assert.IsType(testCase.ResultType, res.Result);

        if (res.Result is OkObjectResult result)
        {
            Assert.IsType<QueryResponse<Instance>>(result.Value);
            var objectResponse = result.Value as QueryResponse<Instance>;
            Assert.Equal(instances, objectResponse?.Instances);
        }

        var repositoryCalls = _instanceRepository.Invocations;
        if (testCase.QueryLength >= 0)
        {
            Assert.Single(repositoryCalls);
            var args = repositoryCalls[0].Arguments;
            Assert.IsType<Dictionary<string, Microsoft.Extensions.Primitives.StringValues>>(args[0]);
            var query = args[0] as Dictionary<string, Microsoft.Extensions.Primitives.StringValues>;
            Assert.Equal(testCase.QueryLength, query?.Count);
        }
        else
        {
            Assert.Empty(repositoryCalls);
        }
    }

    public class TestCase
    {
        public string? AuthOrg { get; set; }

        public string? AuthUserId { get; set; }

        public string? Org { get; set; }

        public string? AppId { get; set; }

        public string? CurrentTaskId { get; set; }

        public bool? ProcessIsComplete { get; set; }

        public string? ProcessEndEvent { get; set; }

        public string? ProcessEnded { get; set; }

        public int? InstanceOwnerPartyId { get; set; }

        public string? LastChanged { get; set; }

        public string? Created { get; set; }

        public string? VisibleAfter { get; set; }

        public string? DueBefore { get; set; }

        public string? ExcludeConfirmedBy { get; set; }

        public bool IsSoftDeleted { get; set; }

        public bool IsHardDeleted { get; set; }

        public bool IsArchived { get; set; }

        public string? ContinuationToken { get; set; }

        public int? Size { get; set; }

        public Type ResultType { get; set; } = null!;

        public int QueryLength { get; set; } = -1;
    }
}
