using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using System.Xml;
using Altinn.Authorization.ABAC;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Platform.Authorization.ModelBinding;
using LocalTest.Configuration;
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
            IOptions<LocalPlatformSettings> localPlatformSettings
        )
        {
            _logger = logger;
            _contextHandler = contextHandler;
            _prp = policyRetrievalPoint;
            _testDataService = testDataService;
            _localPlatformSettings = localPlatformSettings;
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
                delegationResponse = await AuthorizeUsingDelegations(appPolicyResponse, decisionRequest, pdp);
            }

            await AuditRequest(decisionRequest, appPolicyResponse, delegationResponse);
            
            XacmlContextResponse[] results = [appPolicyResponse, delegationResponse];
            return results.Where(r => r is not null).MinBy(r => r.Results.Min(v => v.Decision)) 
                ?? throw new InvalidOperationException("Couldn't authorize");
        }

        private async Task<XacmlContextResponse> AuthorizeUsingDelegations(
            XacmlContextResponse appPolicyResponse, 
            XacmlContextRequest decisionRequest,
            PolicyDecisionPoint pdp
        )
        {
            var subjectCategory = new Uri(XacmlConstants.MatchAttributeCategory.Subject);
            var systemUserUUidId = new Uri(AltinnXacmlUrns.SystemUserUuid);
            var subjectAttribute = decisionRequest.Attributes.SingleOrDefault(a => a.Category == subjectCategory);
            if (subjectAttribute is not null)
            {
                var systemUserAttr = subjectAttribute.Attributes.SingleOrDefault(a => a.AttributeId == systemUserUUidId);
                if (systemUserAttr is not null)
                {
                    var systemUserAttrValue = systemUserAttr.AttributeValues.Single();
                    var testData = await _testDataService.GetTestData();
                    // Generate XACML policy in memory where the system user has access to the party associated 
                    // with the organisation number of the systemuser
                    if (!testData.Authorization.SystemUsers.TryGetValue(systemUserAttrValue.Value, out var systemUser))
                        return appPolicyResponse;

                    var orgNo = systemUser.PartyOrgNo;
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

                    var resourceAttributesCategory = decisionRequest.Attributes
                        .SingleOrDefault(a => a.Category == new Uri(XacmlConstants.MatchAttributeCategory.Resource));
                    var resourceAttributes = resourceAttributesCategory?.Attributes.Select(
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
                                            category: subjectCategory,
                                            attributeId: systemUserUUidId,
                                            dataType: systemUserAttrValue.DataType,
                                            mustBePresent: false
                                        )
                                    )
                                ])
                            ]),
                            // Resource
                            new XacmlAnyOf([
                                new XacmlAllOf([
                                    ..resourceAttributes.Select(a => new XacmlMatch(
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
                            ..systemUser.AppRights.Select(a => new XacmlAnyOf([
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
