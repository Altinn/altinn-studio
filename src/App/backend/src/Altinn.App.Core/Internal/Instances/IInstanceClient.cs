using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Core.Internal.Instances;

// [Obsolete] TODO: Remove default implementations without authentication method and cancellation token when breaking binary compatibility in the next major version.

/// <summary>
/// Interface for handling form data related operations
/// </summary>
public interface IInstanceClient
{
    /// <summary>
    /// Gets the instance
    /// </summary>
    Task<Instance> GetInstance(
        string app,
        string org,
        int instanceOwnerPartyId,
        Guid instanceId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Gets the instance
    /// </summary>
    Task<Instance> GetInstance(string app, string org, int instanceOwnerPartyId, Guid instanceId) =>
        GetInstance(app, org, instanceOwnerPartyId, instanceId, null, default);

    /// <summary>
    /// Gets the instance anew. Instance must have set appId, instanceOwner.PartyId and Id.
    /// </summary>
    Task<Instance> GetInstance(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Gets the instance anew. Instance must have set appId, instanceOwner.PartyId and Id.
    /// </summary>
    Task<Instance> GetInstance(Instance instance) => GetInstance(instance, null, default);

    /// <summary>
    /// Gets a list of instances based on a dictionary of provided query parameters.
    /// </summary>
    Task<List<Instance>> GetInstances(
        Dictionary<string, StringValues> queryParams,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Gets a list of instances based on a dictionary of provided query parameters.
    /// </summary>
    Task<List<Instance>> GetInstances(Dictionary<string, StringValues> queryParams) =>
        GetInstances(queryParams, null, default);

    /// <summary>
    /// Updates the process model of the instance and returns the updated instance.
    /// </summary>
    Task<Instance> UpdateProcess(
        Instance instance,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Updates the process model of the instance and returns the updated instance.
    /// </summary>
    Task<Instance> UpdateProcess(Instance instance) => UpdateProcess(instance, null, default);

    /// <summary>
    /// Updates the process model of the instance and the instance events and returns the updated instance.
    /// </summary>
    Task<Instance> UpdateProcessAndEvents(
        Instance instance,
        List<InstanceEvent> events,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Updates the process model of the instance and the instance events and returns the updated instance.
    /// </summary>
    Task<Instance> UpdateProcessAndEvents(Instance instance, List<InstanceEvent> events) =>
        UpdateProcessAndEvents(instance, events, null, default);

    /// <summary>
    /// Creates an instance of an application with no data.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceTemplate">the instance template to create (must have instanceOwner with partyId, personNumber or organisationNumber set)</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>The created instance</returns>
    Task<Instance> CreateInstance(
        string org,
        string app,
        Instance instanceTemplate,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Creates an instance of an application with no data.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceTemplate">the instance template to create (must have instanceOwner with partyId, personNumber or organisationNumber set)</param>
    /// <returns>The created instance</returns>
    Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate) =>
        CreateInstance(org, app, instanceTemplate, null, default);

    /// <summary>
    /// Add complete confirmation.
    /// </summary>
    /// <remarks>
    /// Add to an instance that a given stakeholder considers the instance as no longer needed by them. The stakeholder has
    /// collected all the data and information they needed from the instance and expect no additional data to be added to it.
    /// The body of the request isn't used for anything despite this being a POST operation.
    /// </remarks>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> AddCompleteConfirmation(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Add complete confirmation.
    /// </summary>
    /// <remarks>
    /// Add to an instance that a given stakeholder considers the instance as no longer needed by them. The stakeholder has
    /// collected all the data and information they needed from the instance and expect no additional data to be added to it.
    /// The body of the request isn't used for anything despite this being a POST operation.
    /// </remarks>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> AddCompleteConfirmation(int instanceOwnerPartyId, Guid instanceGuid) =>
        AddCompleteConfirmation(instanceOwnerPartyId, instanceGuid, null, default);

    /// <summary>
    /// Update read status.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="readStatus">The new instance read status.</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdateReadStatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string readStatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Update read status.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to confirm as complete.</param>
    /// <param name="readStatus">The new instance read status.</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdateReadStatus(int instanceOwnerPartyId, Guid instanceGuid, string readStatus) =>
        UpdateReadStatus(instanceOwnerPartyId, instanceGuid, readStatus, null, default);

    /// <summary>
    /// Update substatus.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to be updated.</param>
    /// <param name="substatus">The new substatus.</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdateSubstatus(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Substatus substatus,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Update substatus.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to be updated.</param>
    /// <param name="substatus">The new substatus.</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdateSubstatus(int instanceOwnerPartyId, Guid instanceGuid, Substatus substatus) =>
        UpdateSubstatus(instanceOwnerPartyId, instanceGuid, substatus, null, default);

    /// <summary>
    /// Update presentation texts.
    /// </summary>
    /// <remarks>
    /// The provided presentation texts will be merged with the existing collection of presentation texts on the instance.
    /// </remarks>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to update presentation texts for.</param>
    /// <param name="presentationTexts">The presentation texts</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdatePresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Update presentation texts.
    /// </summary>
    /// <remarks>
    /// The provided presentation texts will be merged with the existing collection of presentation texts on the instance.
    /// </remarks>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to update presentation texts for.</param>
    /// <param name="presentationTexts">The presentation texts</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdatePresentationTexts(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        PresentationTexts presentationTexts
    ) => UpdatePresentationTexts(instanceOwnerPartyId, instanceGuid, presentationTexts, null, default);

    /// <summary>
    /// Update data values.
    /// </summary>
    /// <remarks>
    /// The provided data values will be merged with the existing collection of data values on the instance.
    /// </remarks>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to update data values for.</param>
    /// <param name="dataValues">The data values</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdateDataValues(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        DataValues dataValues,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Update data values.
    /// </summary>
    /// <remarks>
    /// The provided data values will be merged with the existing collection of data values on the instance.
    /// </remarks>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to update data values for.</param>
    /// <param name="dataValues">The data values</param>
    /// <returns>Returns the updated instance.</returns>
    Task<Instance> UpdateDataValues(int instanceOwnerPartyId, Guid instanceGuid, DataValues dataValues) =>
        UpdateDataValues(instanceOwnerPartyId, instanceGuid, dataValues, null, default);

    /// <summary>
    /// Update data data values.
    /// </summary>
    /// <remarks>
    /// The provided data value will be added with the existing collection of data values on the instance.
    /// </remarks>
    /// <param name="instance">The instance</param>
    /// <param name="dataValues">The data value (null unsets the value)</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    async Task<Instance> UpdateDataValues(
        Instance instance,
        Dictionary<string, string?> dataValues,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        var id = new InstanceIdentifier(instance);
        return await UpdateDataValues(
            id.InstanceOwnerPartyId,
            id.InstanceGuid,
            new DataValues { Values = dataValues },
            authenticationMethod,
            ct
        );
    }

    /// <summary>
    /// Update data data values.
    /// </summary>
    /// <remarks>
    /// The provided data value will be added with the existing collection of data values on the instance.
    /// </remarks>
    /// <param name="instance">The instance</param>
    /// <param name="dataValues">The data value (null unsets the value)</param>
    /// <returns>Returns the updated instance.</returns>
    async Task<Instance> UpdateDataValues(Instance instance, Dictionary<string, string?> dataValues) =>
        await UpdateDataValues(instance, dataValues, null, default);

    /// <summary>
    /// Update single data value.
    /// </summary>
    /// <remarks>
    /// The provided data value will be added with the existing collection of data values on the instance.
    /// </remarks>
    /// <param name="instance">The instance</param>
    /// <param name="key">The key of the DataValues collection to be updated.</param>
    /// <param name="value">The data value (null unsets the value)</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the updated instance.</returns>
    async Task<Instance> UpdateDataValue(
        Instance instance,
        string key,
        string? value,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        return await UpdateDataValues(
            instance,
            new Dictionary<string, string?> { { key, value } },
            authenticationMethod,
            ct
        );
    }

    /// <summary>
    /// Update single data value.
    /// </summary>
    /// <remarks>
    /// The provided data value will be added with the existing collection of data values on the instance.
    /// </remarks>
    /// <param name="instance">The instance</param>
    /// <param name="key">The key of the DataValues collection to be updated.</param>
    /// <param name="value">The data value (null unsets the value)</param>
    /// <returns>Returns the updated instance.</returns>
    async Task<Instance> UpdateDataValue(Instance instance, string key, string? value) =>
        await UpdateDataValue(instance, key, value, null, default);

    /// <summary>
    /// Delete instance.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to delete.</param>
    /// <param name="hard">Boolean to indicate if instance should be hard deleted.</param>
    /// <param name="authenticationMethod">The AuthenticationMethod to use against storage</param>
    /// <param name="ct">CancellationToken</param>
    /// <returns>Returns the deleted instance.</returns>
    Task<Instance> DeleteInstance(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        bool hard,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Delete instance.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The party id of the instance owner.</param>
    /// <param name="instanceGuid">The id of the instance to delete.</param>
    /// <param name="hard">Boolean to indicate if instance should be hard deleted.</param>
    /// <returns>Returns the deleted instance.</returns>
    Task<Instance> DeleteInstance(int instanceOwnerPartyId, Guid instanceGuid, bool hard) =>
        DeleteInstance(instanceOwnerPartyId, instanceGuid, hard, null, default);
}
