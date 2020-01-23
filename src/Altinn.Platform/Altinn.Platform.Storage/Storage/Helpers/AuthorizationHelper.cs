using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Custom PEP to create multi decision request.
    /// </summary>
    public class AuthorizationHelper
    {
        private readonly IPDP _pdp;
        private readonly ILogger _logger;

        private const string XacmlResourceTaskId = "urn:altinn:task";
        private const string XacmlResourceEndId = "urn:altinn:end-event";
        private const string XacmlResourceActionId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";
        private const string SubjectId = "s";
        private const string ActionId = "a";
        private const string ResourceId = "r";

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizationHelper"/> class.
        /// </summary>
        /// <param name="pdp">The policy decision point</param>
        /// <param name="logger">The logger to use by the class.</param>
        public AuthorizationHelper(IPDP pdp, ILogger<AuthorizationHelper> logger)
        {
            _pdp = pdp;
            _logger = logger;
        }

        /// <summary>
        /// Authorize instances, and returns a list of MesseageBoxInstances with information about read and write rights of each instance. 
        /// </summary>
        public async Task<List<MessageBoxInstance>> AuthorizeMesseageBoxInstances(ClaimsPrincipal user, List<Instance> instances)
        {
            if (instances.Count <= 0)
            {
                return new List<MessageBoxInstance>();
            }

            List<MessageBoxInstance> authorizedInstanceeList = new List<MessageBoxInstance>();
            List<string> actionTypes = new List<string> { "read", "write" };

            _logger.LogInformation($"// AuthorizationHelper // AuthorizeMsgBoxInstances // User: {user}");
            _logger.LogInformation($"// AuthorizationHelper // AuthorizeMsgBoxInstances // Instances count: {instances.Count()}");
            _logger.LogInformation($"// AuthorizationHelper // AuthorizeMsgBoxInstances // Action types: {actionTypes}");
            XacmlJsonRequestRoot xacmlJsonRequest = CreateMultiDecisionRequest(user, instances, actionTypes);

            _logger.LogInformation($"// AuthorizationHelper // AuthorizeMsgBoxInstances // xacmlJsonRequest: {JsonConvert.SerializeObject(xacmlJsonRequest)}");
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);

            foreach (XacmlJsonResult result in response.Response)
            {
                if (DecisionHelper.ValidateDecisionResult(result, user))
                {
                    string instanceId = string.Empty;
                    string actiontype = string.Empty;

                    // Loop through all attributes in Category from the response
                    foreach (XacmlJsonCategory category in result.Category)
                    {
                        var attributes = category.Attribute;

                        foreach (var attribute in attributes)
                        {
                            if (attribute.AttributeId.Equals(XacmlResourceActionId))
                            {
                                actiontype = attribute.Value;
                            }

                            if (attribute.AttributeId.Equals(AltinnXacmlUrns.InstanceId))
                            {
                                instanceId = attribute.Value;
                            }
                        }
                    }

                    // Find the instance that has been validated to add it to the list of authorized instances.
                    Instance authorizedInstance = instances.FirstOrDefault(i => i.Id == instanceId);

                    // Checks if the instance has already been authorized
                    if (authorizedInstanceeList.Any(i => i.Id.Equals(authorizedInstance.Id.Split("/")[1])))
                    {
                        // Only need to check if the action type is write, because read do not add any special rights to the MessageBoxInstane.
                        if (actiontype.Equals("write"))
                        {
                            authorizedInstanceeList.Where(i => i.Id.Equals(authorizedInstance.Id.Split("/")[1])).ToList().ForEach(i => i.AuthorizedForWrite = i.AllowDelete = true);
                        }
                    }
                    else
                    {
                        MessageBoxInstance messageBoxInstance = InstanceHelper.ConvertToMessageBoxInstance(authorizedInstance);

                        if (actiontype.Equals("write"))
                        {
                            messageBoxInstance.AuthorizedForWrite = true;
                            messageBoxInstance.AllowDelete = true;
                        }

                        authorizedInstanceeList.Add(messageBoxInstance);
                    }
                }
            }

            return authorizedInstanceeList;
        }

        /// <summary>
        /// Authorize instances, and returns a list of instances that the user has the right to read. 
        /// </summary>
        public async Task<List<Instance>> AuthorizeInstances(ClaimsPrincipal user, List<Instance> instances)
        {
            if (instances.Count <= 0)
            {
                return instances;
            }

            List<Instance> authorizedInstanceList = new List<Instance>();
            List<string> actionTypes = new List<string> { "read" };

            XacmlJsonRequestRoot xacmlJsonRequest = CreateMultiDecisionRequest(user, instances, actionTypes);
            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);

            foreach (XacmlJsonResult result in response.Response)
            {
                if (DecisionHelper.ValidateDecisionResult(result, user))
                {
                    string instanceId = string.Empty;

                    // Loop through all attributes in Category from the response
                    foreach (XacmlJsonCategory category in result.Category)
                    {
                        var attributes = category.Attribute;

                        foreach (var attribute in attributes)
                        {
                            if (attribute.AttributeId.Equals(AltinnXacmlUrns.InstanceId))
                            {
                                instanceId = attribute.Value;
                            }
                        }
                    }

                    Instance instance = instances.FirstOrDefault(i => i.Id == instanceId);
                    authorizedInstanceList.Add(instance);
                }
            }

            return authorizedInstanceList;
        }

        /// <summary>
        /// Creates multi decision request.
        /// </summary>
        public static XacmlJsonRequestRoot CreateMultiDecisionRequest(ClaimsPrincipal user, List<Instance> instances, List<string> actionTypes)
        {
            if (user == null)
            {
                throw new ArgumentNullException("user");
            }

            XacmlJsonRequest request = new XacmlJsonRequest
            {
                AccessSubject = new List<XacmlJsonCategory>()
            };

            request.AccessSubject.Add(CreateMultipleSubjectCategory(user.Claims));
            request.Action = CreateMultipleActionCategory(actionTypes);
            request.Resource = CreateMultipleResourceCategory(instances);
            request.MultiRequests = CreateMultiRequestsCategory(request.AccessSubject, request.Action, request.Resource);

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
        }

        /// <summary>
        /// Verifies that org string matches org in user claims.
        /// </summary>
        /// <param name="org">Organisation to match in claims.</param>
        /// <param name="user">Claim principal from http context.</param>
        /// <returns></returns>
        public static bool VerifyOrgInClaimPrincipal(string org, ClaimsPrincipal user)
        {
            Console.WriteLine($"AuthzHelper // VerifyOrg // Trying to verify org in claims.");

            string orgClaim = user?.Claims.Where(c => c.Type.Equals(AltinnXacmlUrns.OrgId)).Select(c => c.Value).FirstOrDefault();

            Console.WriteLine($"AuthzHelper // VerifyOrg // Org claim: {orgClaim}.");

            if (org.Equals(orgClaim, StringComparison.CurrentCultureIgnoreCase))
            {
                return true;
            }

            return false;
        }

        private static XacmlJsonCategory CreateMultipleSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = DecisionHelper.CreateSubjectCategory(claims);
            subjectAttributes.Id = SubjectId + "1";

            return subjectAttributes;
        }

        private static List<XacmlJsonCategory> CreateMultipleActionCategory(List<string> actionTypes)
        {
            List<XacmlJsonCategory> actionCategories = new List<XacmlJsonCategory>();
            int counter = 1;

            foreach (string actionType in actionTypes)
            {
                XacmlJsonCategory actionCategory;
                actionCategory = DecisionHelper.CreateActionCategory(actionType, true);
                actionCategory.Id = ActionId + counter.ToString();
                actionCategories.Add(actionCategory);
                counter++;
            }

            return actionCategories;
        }

        private static List<XacmlJsonCategory> CreateMultipleResourceCategory(List<Instance> instances)
        {
            List<XacmlJsonCategory> resourcesCategories = new List<XacmlJsonCategory>();
            int counter = 1;

            foreach (Instance instance in instances)
            {
                XacmlJsonCategory resourceCategory = new XacmlJsonCategory { Attribute = new List<XacmlJsonAttribute>() };

                string instanceId = instance.Id.Split("/")[1];
                string task = instance.Process?.CurrentTask?.ElementId;
                string instanceOwnerPartyId = instance.InstanceOwner.PartyId;
                string org = instance.Org;
                string app = instance.AppId.Split("/")[1];

                if (task != null)
                {
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceTaskId, task, DefaultType, DefaultIssuer));
                }
                else if (instance.Process?.EndEvent != null)
                {
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceEndId, instance.Process.EndEvent, DefaultType, DefaultIssuer));
                }

                if (!string.IsNullOrWhiteSpace(instanceId))
                {
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.InstanceId, instanceOwnerPartyId + "/" + instanceId, DefaultType, DefaultIssuer, true));
                }

                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.PartyId, instanceOwnerPartyId, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.OrgId, org, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.AppId, app, DefaultType, DefaultIssuer));
                resourceCategory.Id = ResourceId + counter.ToString();
                resourcesCategories.Add(resourceCategory);
                counter++;
            }

            return resourcesCategories;
        }

        private static XacmlJsonMultiRequests CreateMultiRequestsCategory(List<XacmlJsonCategory> subjects, List<XacmlJsonCategory> actions, List<XacmlJsonCategory> resources)
        {
            List<string> subjectIds = subjects.Select(s => s.Id).ToList();
            List<string> actionIds = actions.Select(a => a.Id).ToList();
            List<string> resourceIds = resources.Select(r => r.Id).ToList();

            XacmlJsonMultiRequests multiRequests = new XacmlJsonMultiRequests
            {
                RequestReference = CreateRequestReference(subjectIds, actionIds, resourceIds)
            };

            return multiRequests;
        }

        private static List<XacmlJsonRequestReference> CreateRequestReference(List<string> subjectIds, List<string> actionIds, List<string> resourceIds)
        {
            List<XacmlJsonRequestReference> references = new List<XacmlJsonRequestReference>();

            foreach (string resourceId in resourceIds)
            {
                foreach (string actionId in actionIds)
                {
                    foreach (string subjectId in subjectIds)
                    {
                        XacmlJsonRequestReference reference = new XacmlJsonRequestReference();
                        List<string> referenceId = new List<string>
                        {
                            subjectId,
                            actionId,
                            resourceId
                        };
                        reference.ReferenceId = referenceId;
                        references.Add(reference);
                    }
                }
            }

            return references;
        }
    }
}
