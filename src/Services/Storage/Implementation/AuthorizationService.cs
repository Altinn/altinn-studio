﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

using Altinn.Authorization.ABAC.Xacml.JsonProfile;

using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.Authorization;

/// <summary>
/// Implementation of the Storage Authorization service
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="AuthorizationService"/> class.
/// </remarks>
/// <param name="pdp">Policy decision point</param>
/// <param name="claimsPrincipalProvider">A service providing access to the current <see cref="ClaimsPrincipal"/>.</param>
/// <param name="logger">The logger</param>
public class AuthorizationService(
    IPDP pdp, 
    IClaimsPrincipalProvider claimsPrincipalProvider, 
    ILogger<AuthorizationService> logger) : IAuthorization
{
    private readonly IPDP _pdp = pdp;
    private readonly IClaimsPrincipalProvider _claimsPrincipalProvider = claimsPrincipalProvider;
    private readonly ILogger<AuthorizationService> _logger = logger;

    private const string XacmlResourceTaskId = "urn:altinn:task";
    private const string XacmlResourceEndId = "urn:altinn:end-event";
    private const string XacmlResourceActionId = "urn:oasis:names:tc:xacml:1.0:action:action-id";
    private const string DefaultIssuer = "Altinn";
    private const string DefaultType = "string";
    private const string SubjectId = "s";
    private const string ActionId = "a";
    private const string ResourceId = "r";

    /// <inheritdoc/>>
    public async Task<List<MessageBoxInstance>> AuthorizeMesseageBoxInstances(List<Instance> instances, bool includeInstantiate)
    {
        if (instances.Count <= 0)
        {
            return [];
        }

        List<MessageBoxInstance> authorizedInstanceList = [];
        List<string> actionTypes = ["read", "write", "delete"];

        if (includeInstantiate)
        {
            actionTypes.Add("instantiate");
        }

        if (instances.Exists(i => "Signing".Equals(i.Process?.CurrentTask?.AltinnTaskType.ToString(), StringComparison.InvariantCultureIgnoreCase)))
        {
            actionTypes.Add("sign");
        }

        ClaimsPrincipal user = _claimsPrincipalProvider.GetUser();
        XacmlJsonRequestRoot xacmlJsonRequest = CreateMultiDecisionRequest(user, instances, actionTypes);

        XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);
        foreach (XacmlJsonResult result in response.Response.Where(result => DecisionHelper.ValidateDecisionResult(result, user)))
        {
            string instanceId = string.Empty;
            string actiontype = string.Empty;

            foreach (var attributes in result.Category.Select(c => c.Attribute))
            {
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

            Instance authorizedInstance = instances.First(i => i.Id == instanceId);

            MessageBoxInstance authorizedMessageBoxInstance =
                authorizedInstanceList.Find(i => i.Id.Equals(authorizedInstance.Id.Split("/")[1]));
            if (authorizedMessageBoxInstance is null)
            {
                authorizedMessageBoxInstance = InstanceHelper.ConvertToMessageBoxInstance(authorizedInstance);
                authorizedInstanceList.Add(authorizedMessageBoxInstance);
            }

            switch (actiontype)
            {
                case "write":
                    authorizedMessageBoxInstance.AuthorizedForWrite = true;
                    break;
                case "delete":
                    authorizedMessageBoxInstance.AllowDelete = true;
                    break;
                case "instantiate":
                    authorizedMessageBoxInstance.AllowNewCopy = true;
                    break;
                case "sign":
                    authorizedMessageBoxInstance.AuthorizedForSign = true;
                    break;
                case "read":
                    break;
            }
        }

        return authorizedInstanceList;
    }

    /// <inheritdoc/>>
    public async Task<bool> AuthorizeInstanceAction(Instance instance, string action, string task = null)
    {
        string org = instance.Org;
        string app = instance.AppId.Split('/')[1];
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
        XacmlJsonRequestRoot request;

        ClaimsPrincipal user = _claimsPrincipalProvider.GetUser();
        if (instance.Id == null)
        {
            request = DecisionHelper.CreateDecisionRequest(org, app, user, action, instanceOwnerPartyId, null);
        }
        else
        {
            Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);
            request = DecisionHelper.CreateDecisionRequest(org, app, user, action, instanceOwnerPartyId, instanceGuid, task);
        }

        XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);

        if (response?.Response == null)
        {
            _logger.LogInformation("// Authorization Helper // Authorize instance action failed for request: {request}.", JsonSerializer.Serialize(request));
            return false;
        }

        bool authorized = DecisionHelper.ValidatePdpDecision(response.Response, user);
        return authorized;
    }

    /// <inheritdoc/>>
    public async Task<bool> AuthorizeAnyOfInstanceActions(Instance instance, List<string> actions)
    {
        if (actions.Count == 0)
        {
            return false;
        }

        ClaimsPrincipal user = _claimsPrincipalProvider.GetUser();
        XacmlJsonRequestRoot request = CreateMultiDecisionRequest(user, new List<Instance>() { instance }, actions);

        _logger.LogDebug("// Authorization Helper // AuthorizeAnyOfInstanceActions // request: {Request}", JsonSerializer.Serialize(request));
        XacmlJsonResponse response = await _pdp.GetDecisionForRequest(request);
        
        _logger.LogDebug("// Authorization Helper // AuthorizeAnyOfInstanceActions // response: {Response}", JsonSerializer.Serialize(response));
        if (response?.Response != null)
        {
            return response.Response.Exists(result => DecisionHelper.ValidateDecisionResult(result, user));
        }

        _logger.LogInformation("// Authorization Helper // Authorize instance action failed for request: {request}.", JsonSerializer.Serialize(request));
        return false;
    }

    /// <inheritdoc/>>
    public async Task<List<Instance>> AuthorizeInstances(List<Instance> instances)
    {
        if (instances.Count <= 0)
        {
            return instances;
        }

        List<Instance> authorizedInstanceList = new();
        List<string> actionTypes = new() { "read" };

        ClaimsPrincipal user = _claimsPrincipalProvider.GetUser();
        XacmlJsonRequestRoot xacmlJsonRequest = CreateMultiDecisionRequest(user, instances, actionTypes);
        XacmlJsonResponse response = await _pdp.GetDecisionForRequest(xacmlJsonRequest);

        foreach (XacmlJsonResult result in response.Response.Where(result => DecisionHelper.ValidateDecisionResult(result, user)))
        {
            string instanceId = string.Empty;

            // Loop through all attributes in Category from the response
            foreach (var attributes in result.Category.Select(category => category.Attribute))
            {
                foreach (var attribute in attributes.Where(a => a.AttributeId.Equals(AltinnXacmlUrns.InstanceId)))
                {
                    instanceId = attribute.Value;
                }
            }

            Instance instance = instances.Find(i => i.Id == instanceId);
            authorizedInstanceList.Add(instance);
        }

        return authorizedInstanceList;
    }

    /// <inheritdoc/>>
    public bool UserHasRequiredScope(List<string> requiredScope)
    {
        ClaimsPrincipal user = _claimsPrincipalProvider.GetUser();
        string contextScope = user.Identities?
           .FirstOrDefault(i => i.AuthenticationType != null && i.AuthenticationType.Equals("AuthenticationTypes.Federation"))
           ?.Claims
           .Where(c => c.Type.Equals("urn:altinn:scope"))
           ?.Select(c => c.Value).FirstOrDefault();

        contextScope ??= user.Claims.Where(c => c.Type.Equals("scope")).Select(c => c.Value).FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(contextScope))
        {
            return requiredScope.Exists(scope => contextScope.Contains(scope, StringComparison.InvariantCultureIgnoreCase));
        }

        return false;
    }

    /// <inheritdoc/>>
    public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequestRoot xacmlJsonRequest)
    {
        return await _pdp.GetDecisionForRequest(xacmlJsonRequest);
    }

    /// <summary>
    /// Creates multi decision request.
    /// </summary>
    public static XacmlJsonRequestRoot CreateMultiDecisionRequest(ClaimsPrincipal user, List<Instance> instances, List<string> actionTypes)
    {
        ArgumentNullException.ThrowIfNull(user);

        XacmlJsonRequest request = new()
        {
            AccessSubject = new List<XacmlJsonCategory>()
        };

        request.AccessSubject.Add(CreateMultipleSubjectCategory(user.Claims));
        request.Action = CreateMultipleActionCategory(actionTypes);
        request.Resource = CreateMultipleResourceCategory(instances);
        request.MultiRequests = CreateMultiRequestsCategory(request.AccessSubject, request.Action, request.Resource);

        XacmlJsonRequestRoot jsonRequest = new() { Request = request };

        return jsonRequest;
    }

    /// <summary>
    /// Replaces Resource attributes with data from instance. Add all relevant values so PDP have it all
    /// </summary>
    /// <param name="jsonRequest">The JSON Request</param>
    /// <param name="instance">The instance</param>
    public static void EnrichXacmlJsonRequest(XacmlJsonRequestRoot jsonRequest, Instance instance)
    {
        XacmlJsonCategory resourceCategory = new() { Attribute = new List<XacmlJsonAttribute>() };

        var instanceProps = GetInstanceProperties(instance);

        if (instanceProps.Task != null)
        {
            resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceTaskId, instanceProps.Task, DefaultType, DefaultIssuer));
        }
        else if (instance.Process?.EndEvent != null)
        {
            resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceEndId, instance.Process.EndEvent, DefaultType, DefaultIssuer));
        }

        if (!string.IsNullOrWhiteSpace(instanceProps.InstanceId))
        {
            resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.InstanceId, instanceProps.InstanceId, DefaultType, DefaultIssuer, true));
        }

        resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.PartyId, instanceProps.InstanceOwnerPartyId, DefaultType, DefaultIssuer));
        resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.OrgId, instanceProps.Org, DefaultType, DefaultIssuer));
        resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.AppId, instanceProps.App, DefaultType, DefaultIssuer));

        // Replaces the current Resource attributes
        jsonRequest.Request.Resource = new List<XacmlJsonCategory>
        {
            resourceCategory
        };
    }

    private static (string InstanceId, string InstanceGuid, string Task, string InstanceOwnerPartyId, string Org, string App) GetInstanceProperties(Instance instance)
    {
        string instanceId = instance.Id.Contains('/') ? instance.Id : null;
        string instanceGuid = instance.Id.Contains('/') ? instance.Id.Split("/")[1] : instance.Id;
        string task = instance.Process?.CurrentTask?.ElementId;
        string instanceOwnerPartyId = instance.InstanceOwner.PartyId;
        string org = instance.Org;
        string app = instance.AppId.Split("/")[1];

        return (instanceId, instanceGuid, task, instanceOwnerPartyId, org, app);
    }

    private static XacmlJsonCategory CreateMultipleSubjectCategory(IEnumerable<Claim> claims)
    {
        XacmlJsonCategory subjectAttributes = DecisionHelper.CreateSubjectCategory(claims);
        subjectAttributes.Id = SubjectId + "1";

        return subjectAttributes;
    }

    private static List<XacmlJsonCategory> CreateMultipleActionCategory(List<string> actionTypes)
    {
        List<XacmlJsonCategory> actionCategories = new();
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
        List<XacmlJsonCategory> resourcesCategories = new();
        int counter = 1;

        foreach (Instance instance in instances)
        {
            XacmlJsonCategory resourceCategory = new() { Attribute = new List<XacmlJsonAttribute>() };

            var instanceProps = GetInstanceProperties(instance);

            if (instanceProps.Task != null)
            {
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceTaskId, instanceProps.Task, DefaultType, DefaultIssuer));
            }
            else if (instance.Process?.EndEvent != null)
            {
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(XacmlResourceEndId, instance.Process.EndEvent, DefaultType, DefaultIssuer));
            }

            if (!string.IsNullOrWhiteSpace(instanceProps.InstanceId))
            {
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.InstanceId, instanceProps.InstanceId, DefaultType, DefaultIssuer, true));
            }
            else if (!string.IsNullOrEmpty(instanceProps.InstanceGuid))
            {
                resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.InstanceId, instanceProps.InstanceOwnerPartyId + "/" + instanceProps.InstanceGuid, DefaultType, DefaultIssuer, true));
            }

            resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.PartyId, instanceProps.InstanceOwnerPartyId, DefaultType, DefaultIssuer));
            resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.OrgId, instanceProps.Org, DefaultType, DefaultIssuer));
            resourceCategory.Attribute.Add(DecisionHelper.CreateXacmlJsonAttribute(AltinnXacmlUrns.AppId, instanceProps.App, DefaultType, DefaultIssuer));
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

        XacmlJsonMultiRequests multiRequests = new()
        {
            RequestReference = CreateRequestReference(subjectIds, actionIds, resourceIds)
        };

        return multiRequests;
    }

    private static List<XacmlJsonRequestReference> CreateRequestReference(List<string> subjectIds, List<string> actionIds, List<string> resourceIds)
    {
        List<XacmlJsonRequestReference> references = new();

        foreach (string resourceId in resourceIds)
        {
            foreach (string actionId in actionIds)
            {
                foreach (string subjectId in subjectIds)
                {
                    XacmlJsonRequestReference reference = new();
                    List<string> referenceId = new()
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