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

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Custom PEP to create multi decision request.
    /// </summary>
    public class AuthorizeInstancesHelper
    {
        private readonly IPDP _pdp;

        private const string XacmlResourceTaskId = "urn:altinn:task";
        private const string XacmlResourceEndId = "urn:altinn:end-event";
        private const string XacmlResourceActionId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";
        private const string SubjectId = "s";
        private const string ActionId = "a";
        private const string ResourceId = "r";

        /// <summary>
        /// Initializes a new instance of the <see cref="AuthorizeInstancesHelper"/> class.
        /// </summary>
        /// <param name="pdp">The policy decision point</param>
        public AuthorizeInstancesHelper(IPDP pdp)
        {
            _pdp = pdp;
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

            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.AccessSubject.Add(CreateMultipleSubjectCategory(user.Claims));
            request.Action = CreateMultipleActionCategory(actionTypes);
            request.Resource = CreateMultipleResourceCategory(instances);
            request.MultiRequests = CreateMultiRequestsCategory(request.AccessSubject, request.Action, request.Resource);

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
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
                XacmlJsonCategory resourceCategory = new XacmlJsonCategory();
                resourceCategory.Attribute = new List<XacmlJsonAttribute>();

                string instanceId = instance.Id.Split("/")[1];
                string task = instance.Process?.CurrentTask?.ElementId;
                string instanceOwnerPartyId = instance.InstanceOwner.PartyId;
                string org = instance.Org;
                string app = instance.AppId.Split("/")[1];

                if (task == null)
                {
                    task = instance.Process?.EndEvent;
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceEndId, task, DefaultType, DefaultIssuer));
                }
                else
                {
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceTaskId, task, DefaultType, DefaultIssuer));
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

            XacmlJsonMultiRequests multiRequests = new XacmlJsonMultiRequests();
            multiRequests.RequestReference = CreateRequestReference(subjectIds, actionIds, resourceIds);

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
                        List<string> referenceId = new List<string>();
                        referenceId.Add(subjectId);
                        referenceId.Add(actionId);
                        referenceId.Add(resourceId);
                        reference.ReferenceId = referenceId;
                        references.Add(reference);
                    }
                }
            }

            return references;
        }

        /// <summary>
        /// Will check if a instance is already in the list of authorized instances.
        /// Returns the position to the inctance in the list if it is in the list, and -1 if not. 
        /// </summary>
        private int InstanceAlreadyAuthorized(List<MessageBoxInstance> authorizedInstances, Instance instance)
        {
            int instancePosition = 0; 
            foreach (MessageBoxInstance authorizedInstance in authorizedInstances)
            {
                if (authorizedInstance.Id.Equals(instance.Id.Split("/")[1]))
                {
                    return instancePosition;
                }

                instancePosition++;
            }

            return -1;
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

            List<MessageBoxInstance> authorizedInstances = new List<MessageBoxInstance>();
            List<string> actionTypes = new List<string> { "read", "write" };

            XacmlJsonRequestRoot xacmlJsonRequest = CreateMultiDecisionRequest(user, instances, actionTypes);
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

                    // Checks if it has already been authorized.
                    int instancePosition = InstanceAlreadyAuthorized(authorizedInstances, authorizedInstance);

                    // The instance has already been added to the authorizedInstance list if the position is 0 or above. 
                    if (instancePosition >= 0)
                    {
                        // Only need to check if the action type is write, because read do not add any special rights to the MessageBoxInstane.
                        if (actiontype.Equals("write"))
                        {
                            MessageBoxInstance authorizedMsgBoxInstance = authorizedInstances[instancePosition];
                            authorizedMsgBoxInstance.AuthorizedForWrite = true;
                            authorizedMsgBoxInstance.AllowDelete = true;
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

                        authorizedInstances.Add(messageBoxInstance);
                    }
                }
            }

            return authorizedInstances;
        }

        /// <summary>
        /// Authorize instances, and returns a list of instances that the user has the right to read. 
        /// </summary>
        public async Task<List<Instance>> AuthroizeInstances(ClaimsPrincipal user, List<Instance> instances)
        {
            if (instances.Count <= 0)
            {
                return instances;
            }

            List<Instance> authorizedInstances = new List<Instance>();
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
                    authorizedInstances.Add(instance);
                }
            }

            return authorizedInstances;
        }
    }
}
