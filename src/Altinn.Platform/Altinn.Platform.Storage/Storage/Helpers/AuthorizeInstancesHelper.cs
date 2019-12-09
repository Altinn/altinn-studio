using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Helpers
{
    public class AuthorizeInstancesHelper
    {
        private readonly IPDP _pdp;

        private const string XacmlResourcePartyId = "urn:altinn:partyid";
        private const string XacmlInstanceId = "urn:altinn:instance-id";
        private const string XacmlResourceOrgId = "urn:altinn:org";
        private const string XacmlResourceAppId = "urn:altinn:app";
        private const string XacmlResourceTaskId = "urn:altinn:task";
        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";
        private const string SubjectId = "s";
        private const string ActionId = "a";
        private const string ResourceId = "r";

        public AuthorizeInstancesHelper(IPDP pdp)
        {
            _pdp = pdp;
        }

        public XacmlJsonRequestRoot CreateXacmlJsonMultipleRequest(string org, string app, ClaimsPrincipal user, List<string> actionTypes, string instanceOwnerPartyId, List<Instance> instances)
        {
            XacmlJsonRequest request = new XacmlJsonRequest();
            request.AccessSubject = new List<XacmlJsonCategory>();
            request.AccessSubject.Add(CreateMultipleSubjectCategory(user.Claims));
            request.Action = CreateMultipleActionCategory(actionTypes);
            request.Resource = CreateMultipleResourceCategory(org, app, instanceOwnerPartyId, instances);
            request.MultiRequests = CreateMultiRequestsCategory(request.AccessSubject, request.Action, request.Resource);

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
        }

        private XacmlJsonCategory CreateMultipleSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = DecisionHelper.CreateSubjectCategory(claims);
            subjectAttributes.Id = SubjectId + "1";

            return subjectAttributes;
        }

        private List<XacmlJsonCategory> CreateMultipleActionCategory(List<string> actionTypes)
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

        private List<XacmlJsonCategory> CreateMultipleResourceCategory(string org, string app, string instanceOwnerPartyId, List<Instance> instances)
        {
            List<XacmlJsonCategory> resourcesCategories = new List<XacmlJsonCategory>();
            int counter = 1;

            foreach (Instance instance in instances)
            {
                XacmlJsonCategory resourceCategory = new XacmlJsonCategory();
                resourceCategory.Attribute = new List<XacmlJsonAttribute>();

                string instanceId = instance.Id;
                string task = instance.Process?.CurrentTask?.Name ?? string.Empty;

                if (!string.IsNullOrWhiteSpace(instanceId))
                {
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlInstanceId, instanceOwnerPartyId + "/" + instanceId, DefaultType, DefaultIssuer, true));
                }

                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourcePartyId, instanceOwnerPartyId, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceOrgId, org, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceAppId, app, DefaultType, DefaultIssuer));
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceTaskId, task, DefaultType, DefaultIssuer));
                resourceCategory.Id = ResourceId + counter.ToString();
                resourcesCategories.Add(resourceCategory);
                counter++;
            }

            return resourcesCategories;
        }

        private XacmlJsonMultiRequests CreateMultiRequestsCategory(List<XacmlJsonCategory> subjects, List<XacmlJsonCategory> actions, List<XacmlJsonCategory> resources)
        {
            List<string> subjectIds = subjects.Select(s => s.Id).ToList();
            List<string> actionIds = actions.Select(a => a.Id).ToList();
            List<string> resourceIds = resources.Select(r => r.Id).ToList();

            XacmlJsonMultiRequests multiRequests = new XacmlJsonMultiRequests();
            multiRequests.RequestReference = CreateRequestReference(subjectIds, actionIds, resourceIds);

            return multiRequests;
        }

        private List<XacmlJsonRequestReference> CreateRequestReference(List<string> subjectIds, List<string> actionIds, List<string> resourceIds)
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

        public async Task<List<Instance>> GetDecisionForMultipleRequest(XacmlJsonRequestRoot xacmlJsonRequest, ClaimsPrincipal user)
        {
            List<Instance> authorizedInstances = new List<Instance>();

            XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);

            foreach (XacmlJsonResult result in response.Response)
            {
                if (DecisionHelper.ValidateDecisionResult(result, user))
                {

                }
            }

            return authorizedInstances;
        }
    }
}
