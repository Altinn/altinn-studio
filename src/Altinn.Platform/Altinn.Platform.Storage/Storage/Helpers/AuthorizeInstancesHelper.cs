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
    public class AuthorizeInstancesHelper
    {
        private readonly IPDP _pdp;

        private const string XacmlResourceTaskId = "urn:altinn:task";
        private const string XacmlResourceActionId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";
        private const string SubjectId = "s";
        private const string ActionId = "a";
        private const string ResourceId = "r";

        public AuthorizeInstancesHelper(IPDP pdp)
        {
            _pdp = pdp;
        }

        public static XacmlJsonRequestRoot CreateXacmlJsonMultipleRequest(ClaimsPrincipal user, List<Instance> instances)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.AccessSubject.Add(CreateMultipleSubjectCategory(user.Claims));
            request.Action = CreateMultipleActionCategory();
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

        private static List<XacmlJsonCategory> CreateMultipleActionCategory()
        {
            List<XacmlJsonCategory> actionCategories = new List<XacmlJsonCategory>();
            List<string> actionTypes = new List<string>
            {
                "read", "write"
            };
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

                string instanceId = instance.Id;
                string task = instance.Process?.CurrentTask?.Name ?? string.Empty;
                string instanceOwnerPartyId = instance.InstanceOwner.PartyId;
                string org = instance.Org;
                string app = instance.AppId.Split("/")[1];

                if (!string.IsNullOrWhiteSpace(instanceId))
                {
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.InstanceId, instanceOwnerPartyId + "/" + instanceId, DefaultType, DefaultIssuer, true));
                }

                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.PartyId, instanceOwnerPartyId, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.OrgId, org, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.AppId, app, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceTaskId, task, DefaultType, DefaultIssuer));
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

        public async Task<List<MessageBoxInstance>> GetDecisionForMultipleRequest(ClaimsPrincipal user, List<Instance> instances)
        {
            List<MessageBoxInstance> authorizedInstances = new List<MessageBoxInstance>();

            XacmlJsonRequestRoot xacmlJsonRequest = CreateXacmlJsonMultipleRequest(user, instances);

            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);

            foreach (XacmlJsonResult result in response.Response)
            {
                if (DecisionHelper.ValidateDecisionResult(result, user))
                {
                    XacmlJsonAttribute instanceAttribute = result.Category.Select(c => c.Attribute.Find(a => a.AttributeId.Equals(AltinnXacmlUrns.InstanceId))).FirstOrDefault();
                    XacmlJsonAttribute actionAttribute = result.Category.Select(c => c.Attribute.Find(a => a.AttributeId.Equals(XacmlResourceActionId))).FirstOrDefault();
                    string instanceId = instanceAttribute.Value.Split('/')[1];
                    string actiontype = actionAttribute.Value;

                    Instance instance = instances.FirstOrDefault(i => i.Id == instanceId);
                    MessageBoxInstance messageBoxInstance = InstanceHelper.ConvertToMessageBoxInstance(instance);

                    if (actiontype.Equals("write"))
                    {
                        messageBoxInstance.AuthorizedForWrite = true;
                        messageBoxInstance.AllowDelete = true;
                    }

                    authorizedInstances.Add(messageBoxInstance);
                }
            }

            return authorizedInstances;
        }
    }
}
