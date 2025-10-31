using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Interface for data handling
/// </summary>
public interface IDataClient
{
    /// <summary>
    /// Stores the form model
    /// </summary>
    /// <typeparam name="T">The type</typeparam>
    /// <param name="dataToSerialize">The app model to serialize</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="type">The type for serialization</param>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="dataType">The data type to create, must be a valid data type defined in application metadata</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    [Obsolete("Use InsertFormData with Instance parameter instead")]
    Task<DataElement> InsertFormData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        string dataType,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull;

    /// <summary>
    /// Stores the form
    /// </summary>
    /// <typeparam name="T">The model type</typeparam>
    /// <param name="instance">The instance that the data element belongs to</param>
    /// <param name="dataTypeString">The data type with requirements</param>
    /// <param name="dataToSerialize">The data element instance</param>
    /// <param name="type">The class type describing the data</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>The data element metadata</returns>
    [Obsolete("Use the overload without Type parameter")]
    Task<DataElement> InsertFormData<T>(
        Instance instance,
        string dataTypeString,
        T dataToSerialize,
        Type type,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull
    {
        if (dataToSerialize.GetType() != type)
        {
            throw new ArgumentException(
                $"The provided type {type.FullName} does not match the type of dataToSerialize {dataToSerialize.GetType().FullName}"
            );
        }
        return InsertFormData(instance, dataTypeString, dataToSerialize, authenticationMethod, cancellationToken);
    }

    /// <summary>
    /// Creates a new data element for the given instance and data model
    /// </summary>
    /// <param name="instance">The instance to add the element to</param>
    /// <param name="dataTypeId">The id of the data type to add</param>
    /// <param name="dataToSerialize">An instance of the class for the form data</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns></returns>
    Task<DataElement> InsertFormData(
        Instance instance,
        string dataTypeId,
        object dataToSerialize,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// updates the form data
    /// </summary>
    /// <typeparam name="T">The type</typeparam>
    /// <param name="dataToSerialize">The form data to serialize</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="type">The type for serialization</param>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="dataId">the data id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    [Obsolete("Use the UpdateFormData method with Instance parameter instead")]
    Task<DataElement> UpdateData<T>(
        T dataToSerialize,
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
        where T : notnull;

    /// <summary>
    /// updates the form data
    /// </summary>
    /// <param name="instance">The instance</param>
    /// <param name="dataToSerialize">The form data to serialize</param>
    /// <param name="dataElement">The data element</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<DataElement> UpdateFormData(
        Instance instance,
        object dataToSerialize,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the form data
    /// </summary>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="type">The type for serialization</param>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="dataId">the data id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    [Obsolete("Use the overload with Instance parameter instead")]
    Task<object> GetFormData(
        Guid instanceGuid,
        Type type,
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the deserialized form data
    /// </summary>
    /// <param name="instance">The instance</param>
    /// <param name="dataElement">The data element</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns></returns>
    Task<object> GetFormData(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the data as is. Note: This method buffers the entire response in memory before returning the stream.
    /// For memory-efficient processing of large files, use <see cref="GetBinaryDataStream"/> instead.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataId">the data id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    [Obsolete("Org and App parameters are not used, use the overload without these parameters")]
    Task<Stream> GetBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    ) => GetBinaryData(instanceOwnerPartyId, instanceGuid, dataId, authenticationMethod, cancellationToken);

    /// <summary>
    /// Gets the data as is.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataId">the data id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<Stream> GetBinaryData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Gets the data as an unbuffered stream for memory-efficient processing of large files.
    /// Throws <see cref="Altinn.App.Core.Helpers.PlatformHttpException"/> if the data element is not found or other HTTP errors occur.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataId">the data id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="timeout">Optional timeout for the operation. Defaults to 100 seconds if not specified.</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <exception cref="Altinn.App.Core.Helpers.PlatformHttpException">Thrown when the data element is not found or other HTTP errors occur</exception>
    Task<Stream> GetBinaryDataStream(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        TimeSpan? timeout = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Similar to GetBinaryData, but returns the raw bytes instead of a cached stream
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataId">the data id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>The raw HttpResponseMessage from the call to platform</returns>
    [Obsolete("Org and App parameters are not used, use the overload without these parameters")]
    Task<byte[]> GetDataBytes(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    ) => GetDataBytes(instanceOwnerPartyId, instanceGuid, dataId, authenticationMethod, cancellationToken);

    /// <summary>
    /// Similar to GetBinaryData, but returns the raw bytes instead of a cached stream
    /// </summary>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataId">the data id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>The raw bytes from storage</returns>
    Task<byte[]> GetDataBytes(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataId,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Method that gets metadata on form attachments ordered by attachmentType
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>A list with attachments metadata ordered by attachmentType</returns>
    [Obsolete("Org and App parameters are not used, use the overload without these parameters")]
    Task<List<AttachmentList>> GetBinaryDataList(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    ) => GetBinaryDataList(instanceOwnerPartyId, instanceGuid, authenticationMethod, cancellationToken);

    /// <summary>
    /// Method that gets metadata on form attachments ordered by attachmentType
    /// </summary>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>A list with attachments metadata ordered by attachmentType</returns>
    Task<List<AttachmentList>> GetBinaryDataList(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Method that removes a form attachments from disk/storage
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataGuid">The attachment id</param>
    [Obsolete("Use method DeleteData with delayed=false instead.", error: true)]
    Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid) =>
        DeleteData(org, app, instanceOwnerPartyId, instanceGuid, dataGuid, false);

    /// <summary>
    /// Method that removes a data elemen from disk/storage immediatly or marks it as deleted.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataGuid">The attachment id</param>
    /// <param name="delay">A boolean indicating whether or not the delete should be executed immediately or delayed</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    [Obsolete("Use the overload without org and app parameters")]
    Task<bool> DeleteData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    ) => DeleteData(instanceOwnerPartyId, instanceGuid, dataGuid, delay, authenticationMethod, cancellationToken);

    /// <summary>
    /// Method that removes a data elemen from disk/storage immediatly or marks it as deleted.
    /// </summary>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataGuid">The attachment id</param>
    /// <param name="delay">A boolean indicating whether or not the delete should be executed immediately or delayed</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<bool> DeleteData(
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        bool delay,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Method that saves a form attachments to disk/storage and returns the new data element.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataType">The data type to create, must be a valid data type defined in application metadata</param>
    /// <param name="request">Http request containing the attachment to be saved</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    [Obsolete("The overload that takes a HttpRequest is deprecated, use the overload that takes a Stream instead")]
    Task<DataElement> InsertBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string dataType,
        HttpRequest request,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Method that updates a form attachments to disk/storage and returns the updated data element.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="instanceOwnerPartyId">The instance owner id</param>
    /// <param name="instanceGuid">The instance id</param>
    /// <param name="dataGuid">The data id</param>
    /// <param name="request">Http request containing the attachment to be saved</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    [Obsolete(
        message: "Deprecated please use UpdateBinaryData(InstanceIdentifier, string, string, Guid, Stream) instead",
        error: false
    )]
    Task<DataElement> UpdateBinaryData(
        string org,
        string app,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataGuid,
        HttpRequest request,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Method that updates a form attachments to disk/storage and returns the updated data element.
    /// </summary>
    /// <param name="instanceIdentifier">Instance identifier instanceOwnerPartyId and instanceGuid</param>
    /// <param name="contentType">Content type of the updated binary data</param>
    /// <param name="filename">Filename of the updated binary data</param>
    /// <param name="dataGuid">Guid of the data element to update</param>
    /// <param name="stream">Updated binary data</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<DataElement> UpdateBinaryData(
        InstanceIdentifier instanceIdentifier,
        string? contentType,
        string? filename,
        Guid dataGuid,
        Stream stream,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Insert a binary data element.
    /// </summary>
    /// <param name="instanceId">isntanceId = {instanceOwnerPartyId}/{instanceGuid}</param>
    /// <param name="dataType">data type</param>
    /// <param name="contentType">content type</param>
    /// <param name="filename">filename</param>
    /// <param name="stream">the stream to stream</param>
    /// <param name="generatedFromTask">Optional field to set what task the binary data was generated from</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<DataElement> InsertBinaryData(
        string instanceId,
        string dataType,
        string contentType,
        string? filename,
        Stream stream,
        string? generatedFromTask = null,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Updates the data element metadata object.
    /// </summary>
    /// <param name="instance">The instance which is not updated</param>
    /// <param name="dataElement">The data element with values to update</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>the updated data element</returns>
    Task<DataElement> Update(
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lock data element in storage
    /// </summary>
    /// <param name="instanceIdentifier">InstanceIdentifier identifying the instance containing the DataElement to lock</param>
    /// <param name="dataGuid">Id of the DataElement to lock</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<DataElement> LockDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Unlock data element in storage
    /// </summary>
    /// <param name="instanceIdentifier">InstanceIdentifier identifying the instance containing the DataElement to unlock</param>
    /// <param name="dataGuid">Id of the DataElement to unlock</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<DataElement> UnlockDataElement(
        InstanceIdentifier instanceIdentifier,
        Guid dataGuid,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    );
}

/// <summary>
/// Extension methods for IDataClient
/// </summary>
public static class IDataClientExtensions
{
    /// <summary>
    /// Gets the deserialized form data
    /// </summary>
    /// <typeparam name="T">The type</typeparam>
    /// <param name="dataClient">The data client</param>
    /// <param name="instance">The instance</param>
    /// <param name="dataElement">The data element</param>
    /// <param name="authenticationMethod">An optional specification of the authentication method to use for requests</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    public static async Task<T> GetFormData<T>(
        this IDataClient dataClient,
        Instance instance,
        DataElement dataElement,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken cancellationToken = default
    )
    {
        object formData = await dataClient.GetFormData(instance, dataElement, authenticationMethod, cancellationToken);

        if (formData is T typedFormData)
        {
            return typedFormData;
        }

        throw new InvalidCastException(
            $"Failed to cast form data of type {formData?.GetType().FullName ?? "null"} to requested type {typeof(T).FullName}"
        );
    }
}
