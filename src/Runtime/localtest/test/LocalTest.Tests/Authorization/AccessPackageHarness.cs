using System.Security.Claims;
using System.Text.Json;
using System.Xml;
using Altinn.AccessManagement.Controllers;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Authorization.Controllers;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Storage.Repository;
using AltinnCore.Authentication.Constants;
using LocalTest.Configuration;
using LocalTest.Services.AccessManagement;
using LocalTest.Services.AccessManagement.RolePackages;
using LocalTest.Services.Authorization.Implementation;
using LocalTest.Services.Authorization.Interface;
using LocalTest.Services.LocalApp.Implementation;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.Profile.Interface;
using LocalTest.Services.TestData;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Xunit;
using RegisterParties = LocalTest.Services.Register.Interface.IParties;

namespace LocalTest.Tests.Authorization;

/// <summary>
/// Runs decisions and authorized parties against the app test data in <see cref="TestData"/>, with the real context
/// handler, PDP and test data services, and an app policy that permits <c>read</c> to holders of one access package.
/// </summary>
internal sealed class AccessPackageHarness : IDisposable
{
    /// <summary>
    /// Pengelens Partner (user 1001) holds packages for DDG Fitness (500000), whose sub-unit is 500001, and for their
    /// own party. Gjentagende Forelder (user 1002) holds roles only. The system user belongs to DDG Fitness.
    /// </summary>
    public const string TestData = """
        {
          "persons": [
            {
              "partyId": 510001, "ssn": "01017000001", "firstName": "Pengelens", "lastName": "Partner", "userId": 1001,
              "partyRoles": { "510001": [{ "type": "altinn", "value": "priv" }] },
              "accessPackages": {
                "500000": ["regnskapsforer-lonn", "urn:altinn:accesspackage:LONN"],
                "510001": ["skattegrunnlag"]
              }
            },
            {
              "partyId": 510002, "ssn": "01017000002", "firstName": "Gjentagende", "lastName": "Forelder", "userId": 1002,
              "partyRoles": {
                "500000": [{ "type": "altinn", "value": "DAGL" }],
                "500100": [{ "type": "altinn", "value": "ffør" }],
                "500200": [{ "type": "altinn", "value": "ffør" }]
              },
              "accessPackages": null
            }
          ],
          "orgs": [
            { "partyId": 500000, "orgNumber": "910000000", "name": "DDG Fitness", "unitType": "AS" },
            { "partyId": 500001, "orgNumber": "910000001", "name": "DDG Fitness Oslo", "unitType": "BEDR", "parentPartyId": 500000 },
            { "partyId": 500002, "orgNumber": "910000002", "name": "Andre AS", "unitType": "AS" },
            { "partyId": 500100, "orgNumber": "910000100", "name": "Fondet", "unitType": "VPFO" },
            { "partyId": 500200, "orgNumber": "910000200", "name": "Ikke fond AS", "unitType": "AS" }
          ],
          "systems": [
            {
              "id": "910000000_sbs",
              "name": "Sluttbrukersystem",
              "systemUsers": [
                { "id": "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0001", "orgNumber": "910000000", "actions": ["delete"], "accessPackages": ["lonn"] },
                { "id": "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0002", "orgNumber": "910000000", "actions": ["delete"], "accessPackages": null },
                { "id": "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0003", "orgNumber": "910000000", "actions": [] },
                { "id": "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0004", "orgNumber": "910000000", "actions": ["read"] },
                { "id": "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0005", "orgNumber": "910000000", "actions": ["read", "write"] }
              ]
            }
          ]
        }
        """;

    public const string SystemUserWithPackage = "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0001";
    public const string SystemUserWithoutPackage = "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0002";
    public const string SystemUserWithoutActions = "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0003";
    public const string SystemUserWithRead = "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0004";
    public const string SystemUserWithReadAndWrite = "6b1b6c22-0d5c-4bd5-9a8e-1f6f1a2c0005";

    private readonly string _root = Path.Join(Path.GetTempPath(), $"localtest-accesspackages-{Guid.NewGuid():N}");
    private readonly LocalInstanceDelegationsRepository _delegations;
    private readonly DecisionController _decisionController;
    private readonly AuthorizedPartiesController _authorizedPartiesController;

    public AccessPackageHarness(string requiredPackage = "lonn")
    {
        var settings = Options.Create(
            new LocalPlatformSettings
            {
                LocalTestingStorageBasePath = Path.Join(_root, "storage") + "/",
                LocalTestingStaticTestDataPath = Path.Join(_root, "testdata"),
            }
        );
        // The built-in test data, empty
        foreach (
            string folder in new[]
            {
                "authorization/claims",
                "authorization/partylist",
                "authorization/roles",
                "authorization/systems",
                "Profile/User",
                "Register/Org",
                "Register/Party",
                "Register/Person",
            }
        )
        {
            Directory.CreateDirectory(Path.Join(_root, "testdata", folder));
        }
        // except for the role to package mapping, which is the one Localtest ships
        File.Copy(
            Path.Join(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "testdata", "authorization", "role-packages.json"),
            Path.Join(_root, "testdata", "authorization", "role-packages.json")
        );

        var appData = System.Text.Json.JsonSerializer.Deserialize<AppTestDataModel>(TestData, LocalAppHttp.JSON_OPTIONS)!;
        var localApp = new Mock<ILocalApp>();
        localApp
            .Setup(app => app.GetTestDataWithMetadata(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ILocalApp.TestDataResult(appData, AllAppsHaveData: true));
        var testDataService = new TestDataService(
            localApp.Object,
            new TenorDataRepository(settings),
            settings,
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<TestDataService>.Instance
        );

        var policy = Policy(requiredPackage);
        var prp = new Mock<IPolicyRetrievalPoint>();
        prp.Setup(p => p.GetPolicyAsync(It.IsAny<XacmlContextRequest>())).ReturnsAsync(policy);

        var roles = new RolesWrapper(testDataService);
        AccessPackages = new AccessPackagesWrapper(testDataService, new RoleAccessPackages(settings));
        var contextHandler = new ContextHandler(
            Mock.Of<IPolicyInformationRepository>(),
            roles,
            AccessPackages,
            Mock.Of<IUserProfiles>(),
            Mock.Of<RegisterParties>(),
            prp.Object
        );

        _delegations = new LocalInstanceDelegationsRepository(settings);
        _decisionController = new DecisionController(
            NullLogger<DecisionController>.Instance,
            contextHandler,
            prp.Object,
            testDataService,
            settings,
            _delegations,
            Mock.Of<IInstanceRepository>()
        )
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };
        _decisionController.HttpContext.Request.ContentType = "application/json";

        _authorizedPartiesController = new AuthorizedPartiesController(
            new PartiesService(testDataService),
            roles,
            AccessPackages
        );
    }

    public AccessPackagesWrapper AccessPackages { get; }

    /// <summary>Asks for the action (<c>read</c> by default) on the app for the party, as the user or system user.</summary>
    public Task<string> Decide(string subjectAttributeId, string subjectValue, int partyId, string action = "read") =>
        Decide([("urn:altinn:" + subjectAttributeId, subjectValue)], partyId, action);

    /// <summary>Asks for the action on the app for the party, with the subject attributes as the caller gives them.</summary>
    public async Task<string> Decide((string Id, string Value)[] subject, int partyId, string action = "read")
    {
        var request = new XacmlJsonRequestRoot
        {
            Request = new XacmlJsonRequest
            {
                AccessSubject = [Category(subject)],
                Action = [Category(("urn:oasis:names:tc:xacml:1.0:action:action-id", action))],
                Resource =
                [
                    Category(
                        ("urn:altinn:org", "ttd"),
                        ("urn:altinn:app", "access-packages"),
                        ("urn:altinn:partyid", partyId.ToString())
                    ),
                ],
            },
        };
        var result = await _decisionController.Post(
            new XacmlRequestApiModel { BodyContent = JsonConvert.SerializeObject(request) }
        );

        var response = Assert.IsType<XacmlJsonResponse>(Assert.IsType<OkObjectResult>(result).Value);
        return Assert.Single(response.Response).Decision;
    }

    public Task<string> DecideForUser(int userId, int partyId) => Decide("userid", userId.ToString(), partyId);

    public Task<string> DecideForSystemUser(string systemUserId, int partyId, string action = "read") =>
        Decide("systemuser:uuid", systemUserId, partyId, action);

    public async Task<List<AuthorizedPartyDto>> AuthorizedParties(int userId)
    {
        _authorizedPartiesController.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(
                    new ClaimsIdentity([new Claim(AltinnCoreClaimTypes.UserId, userId.ToString())], "test")
                ),
            },
        };
        var result = await _authorizedPartiesController.Get();
        return Assert.IsType<AuthorizedPartiesResponseDto>(Assert.IsType<OkObjectResult>(result.Result).Value).Data;
    }

    private static XacmlJsonCategory Category(params (string Id, string Value)[] attributes) =>
        new()
        {
            Attribute = attributes
                .Select(a => new XacmlJsonAttribute
                {
                    AttributeId = a.Id,
                    Value = a.Value,
                    DataType = "http://www.w3.org/2001/XMLSchema#string",
                })
                .ToList(),
        };

    private static XacmlPolicy Policy(string requiredPackage)
    {
        var xml = $"""
            <xacml:Policy xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17" PolicyId="urn:altinn:policyid:1" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides">
              <xacml:Target/>
              <xacml:Rule RuleId="urn:altinn:ruleid:1" Effect="Permit">
                <xacml:Target>
                  <xacml:AnyOf>
                    <xacml:AllOf>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{requiredPackage}</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:altinn:accesspackage" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                    </xacml:AllOf>
                  </xacml:AnyOf>
                  <xacml:AnyOf>
                    <xacml:AllOf>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">ttd</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">access-packages</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                    </xacml:AllOf>
                  </xacml:AnyOf>
                  <xacml:AnyOf>
                    <xacml:AllOf>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">read</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                    </xacml:AllOf>
                  </xacml:AnyOf>
                </xacml:Target>
              </xacml:Rule>
            </xacml:Policy>
            """;
        using var reader = XmlReader.Create(new StringReader(xml));
        return XacmlParser.ParseXacmlPolicy(reader);
    }

    public void Dispose()
    {
        _delegations.Dispose();
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }
}
