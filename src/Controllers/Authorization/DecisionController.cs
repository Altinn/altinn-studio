using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using System.Xml;
using Altinn.AccessManagement.Controllers;
using Altinn.Authorization.ABAC;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Storage.Repository;
using LocalTest.Configuration;
using LocalTest.Services.AccessManagement;
using LocalTest.Services.Authorization.Interface;
using LocalTest.Services.TestData;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// This is the controller responsible for Policy Enformcent Point endpoint.
    /// It returns a Xacml Context Reponse based on a Context Request
    /// </summary>
    [Route("authorization/api/v1/[controller]")]
    [ApiController]
    public class DecisionController : ControllerBase
    {
        private readonly ILogger<DecisionController> _logger;
        private readonly IContextHandler _contextHandler;
        private readonly IPolicyRetrievalPoint _prp;
        private readonly TestDataService _testDataService;
        private readonly IOptions<LocalPlatformSettings> _localPlatformSettings;
        private readonly LocalInstanceDelegationsRepository _instanceDelegationsRepository;
        private readonly IInstanceRepository _instanceRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="DecisionController"/> class.
        /// </summary>
        /// <param name="contextHandler">The Context handler</param>
        /// <param name="policyRetrievalPoint">The policy Retrieval point</param>
        public DecisionController(
            ILogger<DecisionController> logger,
            IContextHandler contextHandler, 
            IPolicyRetrievalPoint policyRetrievalPoint,
            TestDataService testDataService,
            IOptions<LocalPlatformSettings> localPlatformSettings,
            LocalInstanceDelegationsRepository instanceDelegationsRepository,
            IInstanceRepository instanceRepository
        )
        {
            _logger = logger;
            _contextHandler = contextHandler;
            _prp = policyRetrievalPoint;
            _testDataService = testDataService;
            _localPlatformSettings = localPlatformSettings;
            _instanceDelegationsRepository = instanceDelegationsRepository;
            _instanceRepository = instanceRepository;
        }

        /// <summary>
        /// Decision Point endpoint to authorize Xacml Context Requests
        /// </summary>
        /// <param name="model">A Generic model</param>
        [HttpPost]
        public async Task<ActionResult> Post([FromBody] XacmlRequestApiModel model)
        {
            try
            {
                if (Request.ContentType.Contains("application/json"))
                {
                    return await AuthorizeJsonRequest(model); // lgtm [cs/user-controlled-bypass]
                }
                else
                {
                    return await AuthorizeXmlRequest(model); // lgtm [cs/user-controlled-bypass]
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occured in DecisionController");

                XacmlContextResult result = new XacmlContextResult(XacmlContextDecision.Indeterminate)
                {
                    Status = new XacmlContextStatus(XacmlContextStatusCode.SyntaxError)
                };

                XacmlContextResponse xacmlContextResponse = new XacmlContextResponse(result);

                if (Request.ContentType.Contains("application/json"))
                {
                    XacmlJsonResponse jsonResult = XacmlJsonXmlConverter.ConvertResponse(xacmlContextResponse);
                    return Ok(jsonResult);
                }
                else
                {
                    return CreateResponse(xacmlContextResponse);
                }
            }
        }

        [HttpGet]
        public string Get()
        {
            return "test string";
        }

        private async Task<XacmlJsonResponse> Authorize(XacmlJsonRequest decisionRequest)
        {
            if (decisionRequest.MultiRequests == null || decisionRequest.MultiRequests.RequestReference == null
                || decisionRequest.MultiRequests.RequestReference.Count < 2)
            {
                XacmlContextRequest request = XacmlJsonXmlConverter.ConvertRequest(decisionRequest);
                XacmlContextResponse xmlResponse = await Authorize(request);
                return XacmlJsonXmlConverter.ConvertResponse(xmlResponse);
            }
            else
            {
                XacmlJsonResponse multiResponse = new XacmlJsonResponse();
                foreach (XacmlJsonRequestReference xacmlJsonRequestReference in decisionRequest.MultiRequests.RequestReference)
                {
                    XacmlJsonRequest jsonMultiRequestPart = new XacmlJsonRequest();

                    foreach (string refer in xacmlJsonRequestReference.ReferenceId)
                    {
                        IEnumerable<XacmlJsonCategory> resourceCategoriesPart = decisionRequest.Resource.Where(i => i.Id.Equals(refer));

                        if (resourceCategoriesPart != null && resourceCategoriesPart.Any())
                        {
                            if (jsonMultiRequestPart.Resource == null)
                            {
                                jsonMultiRequestPart.Resource = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.Resource.AddRange(resourceCategoriesPart);
                        }

                        IEnumerable<XacmlJsonCategory> subjectCategoriesPart = decisionRequest.AccessSubject.Where(i => i.Id.Equals(refer));

                        if (subjectCategoriesPart != null && subjectCategoriesPart.Any())
                        {
                            if (jsonMultiRequestPart.AccessSubject == null)
                            {
                                jsonMultiRequestPart.AccessSubject = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.AccessSubject.AddRange(subjectCategoriesPart);
                        }

                        IEnumerable<XacmlJsonCategory> actionCategoriesPart = decisionRequest.Action.Where(i => i.Id.Equals(refer));

                        if (actionCategoriesPart != null && actionCategoriesPart.Any())
                        {
                            if (jsonMultiRequestPart.Action == null)
                            {
                                jsonMultiRequestPart.Action = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.Action.AddRange(actionCategoriesPart);
                        }
                    }

                    XacmlContextResponse partResponse = await Authorize(XacmlJsonXmlConverter.ConvertRequest(jsonMultiRequestPart));
                    XacmlJsonResponse xacmlJsonResponsePart = XacmlJsonXmlConverter.ConvertResponse(partResponse);

                    if (multiResponse.Response == null)
                    {
                        multiResponse.Response = new List<XacmlJsonResult>();
                    }

                    multiResponse.Response.Add(xacmlJsonResponsePart.Response.First());
                }

                return multiResponse;
            }
        }

        private async Task<ActionResult> AuthorizeXmlRequest(XacmlRequestApiModel model)
        {
            XacmlContextRequest request;
            using (XmlReader reader = XmlReader.Create(new StringReader(model.BodyContent)))
            {
                request = XacmlParser.ReadContextRequest(reader);
            }

            XacmlContextResponse xacmlContextResponse = await Authorize(request);
            return CreateResponse(xacmlContextResponse);
        }

        private async Task<ActionResult> AuthorizeJsonRequest(XacmlRequestApiModel model)
        {
            XacmlJsonRequestRoot jsonRequest = (XacmlJsonRequestRoot)JsonConvert.DeserializeObject(model.BodyContent, typeof(XacmlJsonRequestRoot));

            XacmlJsonResponse jsonResponse = await Authorize(jsonRequest.Request);

            return Ok(jsonResponse);
        }

        private ActionResult CreateResponse(XacmlContextResponse xacmlContextResponse)
        {
            StringBuilder builder = new StringBuilder();
            using (XmlWriter writer = XmlWriter.Create(builder))
            {
                XacmlSerializer.WriteContextResponse(writer, xacmlContextResponse);
            }

            string xml = builder.ToString();

            return Content(xml);
        }

        private async Task<XacmlContextResponse> Authorize(XacmlContextRequest decisionRequest)
        {
            decisionRequest = await this._contextHandler.Enrich(decisionRequest);
            XacmlPolicy policy = await this._prp.GetPolicyAsync(decisionRequest);

            PolicyDecisionPoint pdp = new PolicyDecisionPoint();
            XacmlContextResponse appPolicyResponse = pdp.Authorize(decisionRequest, policy);
            XacmlContextResult appPolicyResult = appPolicyResponse.Results.First();
            XacmlContextResponse delegationResponse = null;
            if (appPolicyResult.Decision.Equals(XacmlContextDecision.NotApplicable))
            {
                try 
                {
                    delegationResponse = await AuthorizeUsingDelegations(appPolicyResponse, decisionRequest, pdp);
                }
                catch (Exception ex)
                {
                    // Delegations in localtest is very much hacked together and not very robust,
                    // so for now we will just ignore failures and log them
                    _logger.LogError(ex, "Failed to authorize using delegations");
                }
            }

            await AuditRequest(decisionRequest, appPolicyResponse, delegationResponse);
            
            XacmlContextResponse[] results = [appPolicyResponse, delegationResponse];
            return results.Where(r => r is not null).MinBy(r => r.Results.Min(v => v.Decision)) 
                ?? throw new InvalidOperationException("Couldn't authorize");
        }

        private static readonly Uri _subjectCategory = new Uri(XacmlConstants.MatchAttributeCategory.Subject);
        private static readonly Uri _resourceCategory =  new Uri(XacmlConstants.MatchAttributeCategory.Resource);

        private async Task<XacmlContextResponse> AuthorizeUsingSystemUser(
            XacmlContextResponse appPolicyResponse, 
            XacmlContextRequest decisionRequest,
            PolicyDecisionPoint pdp,
            XacmlAttribute systemUserAttr,
            XacmlContextAttributes resourceAttributes
        )
        {
            var systemUserUUidUrn = new Uri(AltinnXacmlUrns.SystemUserUuid);
            var systemUserAttrValue = systemUserAttr.AttributeValues.Single();
            var testData = await _testDataService.GetTestData();
            // Generate XACML policy in memory where the system user has access to the party associated 
            // with the organisation number of the systemuser
            if (!testData.Authorization.SystemUsers.TryGetValue(systemUserAttrValue.Value, out var systemUser))
                return appPolicyResponse;

            var orgNo = systemUser.OrgNumber;
            var org = testData.Register.Party.Single(p => p.Value.OrgNumber == orgNo).Value;
            var partyId = org.PartyId;
            var suPolicy = new XacmlPolicy(
                new Uri("urn:altinn:policyid:systemuser"), 
                new Uri("urn:oasis:names:tc:xacml:3.0:policy-combining-algorithm:deny-overrides"), 
                new XacmlTarget(null)
            )
            {
                Description = "Policy for system user",
            };

            var resourceAttributesList = resourceAttributes.Attributes.Select(
                a => (AttributeId: a.AttributeId, Value: a.AttributeValues.Single())
            ).ToArray();

            suPolicy.Rules.Add(new XacmlRule("urn:altinn:ruleid:systemuser", XacmlEffectType.Permit)
            {
                Target = new XacmlTarget([
                    // Subject (should only be 1 attr in the case of systemusers)
                    new XacmlAnyOf([
                        new XacmlAllOf([
                            new XacmlMatch(
                                matchId: new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                                attributeValue: systemUserAttrValue,
                                attributeDesignator: new XacmlAttributeDesignator(
                                    category: new Uri(XacmlConstants.MatchAttributeCategory.Subject),
                                    attributeId: systemUserUUidUrn,
                                    dataType: systemUserAttrValue.DataType,
                                    mustBePresent: false
                                )
                            )
                        ])
                    ]),
                    // Resource
                    new XacmlAnyOf([
                        new XacmlAllOf([
                            ..resourceAttributesList.Select(a => new XacmlMatch(
                                matchId: new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                                attributeValue: a.Value,
                                attributeDesignator: new XacmlAttributeDesignator(
                                    category: new Uri(XacmlConstants.MatchAttributeCategory.Resource),
                                    attributeId: a.AttributeId,
                                    dataType: a.Value.DataType,
                                    mustBePresent: false
                                )
                            ))
                        ])
                    ]),
                    // Actions
                    ..systemUser.Actions.Select(a => new XacmlAnyOf([
                        new XacmlAllOf([
                            new XacmlMatch(
                                matchId: new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                                attributeValue: new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), a),
                                attributeDesignator: new XacmlAttributeDesignator(
                                    category: new Uri(XacmlConstants.MatchAttributeCategory.Action),
                                    attributeId: new Uri(XacmlConstants.MatchAttributeIdentifiers.ActionId),
                                    dataType: new Uri(XacmlConstants.DataTypes.XMLString),
                                    mustBePresent: false
                                )
                            )
                        ])
                    ])),
                ])
            });

            return pdp.Authorize(decisionRequest, suPolicy);
        }

        private async Task<XacmlContextResponse> AuthorizeUsingInstanceDelegations(
            XacmlContextResponse appPolicyResponse,
            XacmlContextRequest decisionRequest,
            PolicyDecisionPoint pdp,
            XacmlAttribute instanceIdAttr,
            XacmlAttribute userIdAttr,
            XacmlContextAttributes subjectAttributes,
            XacmlContextAttributes resourceAttributes
        )
        {
            var orgUrn = new Uri(AltinnXacmlUrns.OrgId);
            var appUrn = new Uri(AltinnXacmlUrns.AppId);
            var resourceUrn = new Uri(AltinnXacmlUrns.ResourceId);
            var taskIdUrn = new Uri(AltinnXacmlUrns.TaskId);
            var requestHasOrgAndAppAttrs = 
                resourceAttributes.Attributes.Any(a => a.AttributeId == orgUrn) &&
                resourceAttributes.Attributes.Any(a => a.AttributeId == appUrn);
            var requestHasAppResourceAttr = 
                resourceAttributes.Attributes.Any(a => a.AttributeId == resourceUrn && a.AttributeValues.Any(av => av.Value.StartsWith("app_")));

            var taskIdAttr = resourceAttributes.Attributes.SingleOrDefault(a => a.AttributeId == taskIdUrn);
            var instanceId = instanceIdAttr.AttributeValues.Single().Value;
            var split = instanceId.Split('/');
            if (split.Length != 2)
                throw new Exception("Invalid instance id format - should be <instanceOwnerId>/<instanceGuid>");
            var instanceOwnerIdStr = split[0];
            var instanceOwnerId = int.Parse(instanceOwnerIdStr);
            var instanceGuid = Guid.Parse(split[1]);
            var instance = await _instanceRepository.GetOne(instanceOwnerId, instanceGuid);
            var delegations = await _instanceDelegationsRepository.Read(instanceGuid);
            var currentTaskId = instance.Process?.CurrentTask?.ElementId;
            var reqTaskId = taskIdAttr?.AttributeValues.SingleOrDefault()?.Value;
            if (string.IsNullOrWhiteSpace(currentTaskId)) currentTaskId = null;
            if (string.IsNullOrWhiteSpace(reqTaskId)) reqTaskId = null;
            if (currentTaskId == reqTaskId)
            {
                var testData = await _testDataService.GetTestData();
                var instanceOwnerParty = testData.Register.Party.GetValueOrDefault(instanceOwnerIdStr);
                if (instanceOwnerParty is null)
                    throw new Exception($"Failed to find party with id {instanceOwnerIdStr} in testdata");
                var userId = userIdAttr.AttributeValues.Single().Value;
                var partyList = testData.Authorization.PartyList[userId];

                var relevantDelegations = delegations.Select(d => 
                    {
                        var from = Guid.Parse(d.From.Value);
                        var to = Guid.Parse(d.To.Value);
                        // TODO: we should do this properly, don't know how.
                        // Here we just say that the user has the party in the party list. Something related to key roles...
                        var isMatch = from == instanceOwnerParty.PartyUuid && partyList.Any(p => p.PartyUuid == to);
                        return (IsMatch: isMatch, Delegation: d);
                    })
                    .Where(d => d.IsMatch)
                    .ToArray();

                if (relevantDelegations.Length > 0)
                {
                    var idPolicy = new XacmlPolicy(
                        new Uri("urn:altinn:policyid:instancedelegations"), 
                        new Uri("urn:oasis:names:tc:xacml:3.0:policy-combining-algorithm:deny-overrides"), 
                        new XacmlTarget(null)
                    )
                    {
                        Description = "Policy for instance delegations",
                    };

                    foreach (var delegation in relevantDelegations)
                    {
                        foreach (var rights in delegation.Delegation.Rights)
                        {
                            if (!requestHasAppResourceAttr && !requestHasOrgAndAppAttrs)
                                throw new Exception("Missing org and app information resource attributes in authorization request");

                            var rightsHasOrgAndAppAttrs = 
                                rights.Resource.Any(r => r.Type == AltinnXacmlUrns.OrgId) &&
                                rights.Resource.Any(r => r.Type == AltinnXacmlUrns.AppId);
                            var rightsHasAppResourceAttr = 
                                rights.Resource.Any(r => r.Type == AltinnXacmlUrns.ResourceId && r.Value.StartsWith("app_"));

                            IEnumerable<UrnValue> rightsResource = rights.Resource;
                            if (requestHasOrgAndAppAttrs && !rightsHasOrgAndAppAttrs && rightsHasAppResourceAttr)
                            {
                                // Replace the AppResource attributes with Org and App attributes
                                var appResource = rightsResource.Single(r => r.Type == AltinnXacmlUrns.ResourceId);
                                var appResourceValue = appResource.Value;
                                var appResourceSplit = appResourceValue.Split('_', count: 3); // Format is app_<org>_<app>
                                var org = appResourceSplit[1];
                                var app = appResourceSplit[2];
                                rightsResource = [
                                    ..rightsResource.Except([appResource]), 
                                    new UrnValue(AltinnXacmlUrns.OrgId, org),
                                    new UrnValue(AltinnXacmlUrns.AppId, app)
                                ];
                            }
                            if (requestHasAppResourceAttr && !rightsHasAppResourceAttr && rightsHasOrgAndAppAttrs)
                            {
                                // Replace the Org and App attributes with an AppResource attribute
                                var org = rightsResource.Single(r => r.Type == AltinnXacmlUrns.OrgId);
                                var app = rightsResource.Single(r => r.Type == AltinnXacmlUrns.AppId);
                                var orgValue = org.Value;
                                var appValue = app.Value;
                                rightsResource = [
                                    ..rightsResource.Except([org, app]), 
                                    new UrnValue(AltinnXacmlUrns.ResourceId, $"app_{orgValue}_{appValue}")
                                ];
                            }

                            idPolicy.Rules.Add(new XacmlRule($"urn:altinn:ruleid:{Guid.NewGuid()}", XacmlEffectType.Permit)
                            {
                                Target = new XacmlTarget([
                                    // Subject - here we just copy attributes from the request, 
                                    // since we've qualified the delegations above... This is not the right way..
                                    new XacmlAnyOf([
                                        new XacmlAllOf([
                                            ..subjectAttributes.Attributes
                                                .Where(a => a.AttributeId != new Uri("urn:altinn:rolecode"))
                                                .Select(a => new XacmlMatch(
                                                    matchId: new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                                                    attributeValue: a.AttributeValues.Single(),
                                                    attributeDesignator: new XacmlAttributeDesignator(
                                                        category: _subjectCategory,
                                                        attributeId: a.AttributeId,
                                                        dataType: a.AttributeValues.Single().DataType,
                                                        mustBePresent: false
                                                    )
                                                ))
                                        ])
                                    ]),
                                    // Resource - resource comes from the delegation
                                    new XacmlAnyOf([
                                        new XacmlAllOf([
                                            ..rightsResource.Select(r => new XacmlMatch(
                                                matchId: new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                                                attributeValue: new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), r.Value),
                                                attributeDesignator: new XacmlAttributeDesignator(
                                                    category: _resourceCategory,
                                                    attributeId: new Uri(r.Type),
                                                    dataType: new Uri(XacmlConstants.DataTypes.XMLString),
                                                    mustBePresent: false
                                                )
                                            ))
                                        ])
                                    ]),
                                    // Actions - action comes from the delegation
                                    new XacmlAnyOf([
                                        new XacmlAllOf([
                                            new XacmlMatch(
                                                matchId: new Uri(XacmlConstants.AttributeMatchFunction.StringEqual),
                                                attributeValue: new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), rights.Action.Value),
                                                attributeDesignator: new XacmlAttributeDesignator(
                                                    category: new Uri(XacmlConstants.MatchAttributeCategory.Action),
                                                    attributeId: new Uri(XacmlConstants.MatchAttributeIdentifiers.ActionId),
                                                    dataType: new Uri(XacmlConstants.DataTypes.XMLString),
                                                    mustBePresent: false
                                                )
                                            )
                                        ])
                                    ]),
                                ])
                            });
                        }
                    }

                    return pdp.Authorize(decisionRequest, idPolicy);
                }
            }

            return null;
        }

        private async Task<XacmlContextResponse> AuthorizeUsingDelegations(
            XacmlContextResponse appPolicyResponse, 
            XacmlContextRequest decisionRequest,
            PolicyDecisionPoint pdp
        )
        {
            var subjectAttributes = decisionRequest.Attributes.SingleOrDefault(a => a.Category == _subjectCategory);
            var resourceAttributes = decisionRequest.Attributes.SingleOrDefault(a => a.Category == _resourceCategory);

            if (resourceAttributes is null || subjectAttributes is null)
                throw new Exception("Missing subject and resource attributes in authorization request");

            // System user delegations
            var systemUserUUidUrn = new Uri(AltinnXacmlUrns.SystemUserUuid);
            var systemUserAttr = subjectAttributes.Attributes.SingleOrDefault(a => a.AttributeId == systemUserUUidUrn);
            if (systemUserAttr is not null)
            {
                return await AuthorizeUsingSystemUser(
                    appPolicyResponse, 
                    decisionRequest, 
                    pdp, 
                    systemUserAttr, 
                    resourceAttributes
                );
            }

            // Instance delegations
            var instanceIdUrn = new Uri(AltinnXacmlUrns.InstanceId);
            var userIdUrn = new Uri(AltinnXacmlUrns.UserAttribute);
            var instanceIdAttr = resourceAttributes.Attributes.SingleOrDefault(a => a.AttributeId == instanceIdUrn);
            var userIdAttr = subjectAttributes.Attributes.SingleOrDefault(a => a.AttributeId == userIdUrn);
            if (instanceIdAttr is not null && userIdAttr is not null)
            {
                var instanceDelegationResponse = await AuthorizeUsingInstanceDelegations(
                    appPolicyResponse,
                    decisionRequest,
                    pdp,
                    instanceIdAttr,
                    userIdAttr,
                    subjectAttributes,
                    resourceAttributes
                );
                if (instanceDelegationResponse is not null)
                    return instanceDelegationResponse;
            }

            return null;
        }

        private static readonly JsonSerializerOptions _jsonSerializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
            WriteIndented = true,
            TypeInfoResolver = new DefaultJsonTypeInfoResolver
            {
                Modifiers = { ContractModifierForDefaultValues }
            }
        };
        private async Task AuditRequest(
            XacmlContextRequest decisionRequest,
            XacmlContextResponse appPolicyResponse, 
            XacmlContextResponse delegationResponse
        )
        {
            try 
            {
                var settings = _localPlatformSettings.Value;
                var directory = settings.LocalTestingStorageBasePath + settings.AuthorizationAuditFolder;
                if (!Directory.Exists(directory))
                    Directory.CreateDirectory(directory);

                    
                var actionCategory = new Uri(XacmlConstants.MatchAttributeCategory.Action);
                var actionAttrId = new Uri(XacmlConstants.MatchAttributeIdentifiers.ActionId);
                var actionAttr = decisionRequest.Attributes.SingleOrDefault(a => a.Category == actionCategory);
                var actions = actionAttr?.Attributes
                    .SingleOrDefault(a => a.AttributeId == actionAttrId)?
                    .AttributeValues
                    .Select(v => v.Value)
                    .ToArray() ?? [];
                Array.Sort(actions);

                var timestamp = DateTimeOffset.Now.ToString("yyyy'-'MM'-'dd'T'HH':'mm':'ss.fff");
                var actionsStr = string.Join("+", actions);
                var fileName = $"{timestamp}_{actionsStr}.json";
                var filePath = Path.Combine(directory, fileName);
                var log = new 
                {
                    Request = decisionRequest,
                    AppPolicyResponse = appPolicyResponse,
                    DelegationResponse = delegationResponse
                };
                await using var file = System.IO.File.OpenWrite(filePath);
                await System.Text.Json.JsonSerializer.SerializeAsync(file, log, _jsonSerializerOptions);
            }
            catch (Exception e)
            {
                _logger.LogError(e, "Failed to audit authorization request");
            }
        }
        
        private static void ContractModifierForDefaultValues(JsonTypeInfo contract)
        {
            if (contract.Kind != JsonTypeInfoKind.Object)
            {
                return;
            }
            foreach (var prop in contract.Properties)
            {
                if (prop.PropertyType.IsAssignableTo(typeof(System.Collections.ICollection)))
                {
                    prop.ShouldSerialize = static (_, child) => child is System.Collections.ICollection { Count: > 0 };
                }
                else if (prop.PropertyType.IsAssignableTo(typeof(System.Collections.IEnumerable)))
                {
                    prop.ShouldSerialize = static (_, child) => 
                    {
                        System.Collections.IEnumerable enumerable = (System.Collections.IEnumerable)child;
                        if (enumerable is null)
                            return false;

                        var enumerator = enumerable.GetEnumerator();
                        try 
                        {
                            return enumerator.MoveNext();
                        }
                        finally
                        {
                            if (enumerator is IDisposable disposable)
                            {
                                disposable.Dispose();
                            }
                        }
                    };
                }
                else
                {
                    prop.ShouldSerialize = static (_, child) => 
                    {
                        if (child is XacmlContextDecision)
                            return true;

                        return !IsNullOrDefault(child);
                    };
                }
            }
        }

        public static bool IsNullOrDefault<T>(T argument)
        {
            // deal with normal scenarios
            if (argument is null) return true;
            if (object.Equals(argument, default(T))) return true;

            // deal with non-null nullables
            Type methodType = typeof(T);
            if (Nullable.GetUnderlyingType(methodType) != null) return false;

            // deal with boxed value types
            Type argumentType = argument.GetType();
            if (argumentType.IsValueType && argumentType != methodType) 
            {
                object obj = Activator.CreateInstance(argument.GetType());
                return obj.Equals(argument);
            }

            return false;
        }
    }
}
