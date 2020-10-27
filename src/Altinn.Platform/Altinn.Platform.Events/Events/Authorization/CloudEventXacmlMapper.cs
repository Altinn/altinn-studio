using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Authorization
{
    /// <summary>
    /// Utility class for converting Events to XACML request
    /// </summary>
    public static class CloudEventXacmlMapper
    {
        private const string DefaultIssuer = "Altinn";
        private const string DefaultType = "string";
        private const string SubjectId = "s";
        private const string ActionId = "a";
        private const string ResourceId = "r";

        /// <summary>
        /// Create XACML request for multiple 
        /// </summary>
        /// <param name="user">The user</param>
        /// <param name="events">The list of events</param>
        /// <returns></returns>
        public static XacmlJsonRequestRoot CreateMultiDecisionRequest(ClaimsPrincipal user, List<CloudEvent> events)
        {
            List<string> actionTypes = new List<string> { "read" };

            if (user == null)
            {
                throw new ArgumentNullException(nameof(user));
            }

            XacmlJsonRequest request = new XacmlJsonRequest
            {
                AccessSubject = new List<XacmlJsonCategory>()
            };

            request.AccessSubject.Add(CreateMultipleSubjectCategory(user.Claims));
            request.Action = CreateMultipleActionCategory(actionTypes);
            request.Resource = CreateMultipleResourceCategory(events);
            request.MultiRequests = CreateMultiRequestsCategory(request.AccessSubject, request.Action, request.Resource);

            XacmlJsonRequestRoot jsonRequest = new XacmlJsonRequestRoot() { Request = request };

            return jsonRequest;
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

        private static List<XacmlJsonCategory> CreateMultipleResourceCategory(List<CloudEvent> events)
        {
            List<XacmlJsonCategory> resourcesCategories = new List<XacmlJsonCategory>();
            int counter = 1;

            foreach (CloudEvent cloudEvent in events)
            {
                XacmlJsonCategory resourceCategory = new XacmlJsonCategory { Attribute = new List<XacmlJsonAttribute>() };

                Uri source = cloudEvent.Source;

                string path = source.PathAndQuery;

                string[] paths = path.Split("/");

                if (paths.Length == 6)
                {
                    // This is the scenario for events related to a given instance
                    string instanceId = paths[4] + "/" + paths[5];
                    string instanceOwnerPartyId = cloudEvent.Subject.Split("/")[2];
                    string org = paths[1];
                    string app = paths[2];
                    string eventId = cloudEvent.Id;

                    if (!string.IsNullOrWhiteSpace(instanceId))
                    {
                        resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.InstanceId, instanceId, DefaultType, DefaultIssuer, true));
                    }

                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.AppResource, "events", DefaultType, DefaultIssuer));
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.EventId, eventId, DefaultType, DefaultIssuer, true));
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.PartyId, instanceOwnerPartyId, DefaultType, DefaultIssuer));
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.OrgId, org, DefaultType, DefaultIssuer));
                    resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.AppId, app, DefaultType, DefaultIssuer));
                    resourceCategory.Id = ResourceId + counter.ToString();
                    resourcesCategories.Add(resourceCategory);
                    counter++;
                }
            }

            return resourcesCategories;
        }

        private static XacmlJsonCategory CreateMultipleSubjectCategory(IEnumerable<Claim> claims)
        {
            XacmlJsonCategory subjectAttributes = DecisionHelper.CreateSubjectCategory(claims);
            subjectAttributes.Id = SubjectId + "1";

            return subjectAttributes;
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
