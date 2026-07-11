#nullable disable

using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents an application by providing information about it.
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class Application : ChangableElement
{
    /// <summary>
    /// Gets or sets the unique id of the application, e.g. test/app-34
    /// </summary>
    [JsonProperty(PropertyName = "id")]
    public string Id { get; set; }

    /// <summary>
    /// Gets or sets the application version id.
    /// </summary>
    [JsonProperty(PropertyName = "versionId")]
    public string VersionId { get; set; }

    /// <summary>
    /// Gets or sets the short code representing the owner of the service. E.g. nav
    /// </summary>
    [JsonProperty(PropertyName = "org")]
    public string Org { get; set; }

    /// <summary>
    /// Gets or sets the title of the application with language codes.
    /// </summary>
    [JsonProperty(PropertyName = "title")]
    public Dictionary<string, string> Title { get; set; }

    /// <summary>
    /// Gets or sets the date and time from when the application is valid/can be used.
    /// </summary>
    [JsonProperty(PropertyName = "validFrom")]
    public DateTime? ValidFrom { get; set; }

    /// <summary>
    /// Gets or sets the date and time at when the application is no longer valid/can no longer be used.
    /// </summary>
    [JsonProperty(PropertyName = "validTo")]
    public DateTime? ValidTo { get; set; }

    /// <summary>
    /// Gets or sets an identifier of the process model that is used by the application.
    /// </summary>
    [JsonProperty(PropertyName = "processId")]
    public string ProcessId { get; set; }

    /// <summary>
    /// Gets or sets a list of data types that are allowed on an instance of this application.
    /// </summary>
    [JsonProperty(PropertyName = "dataTypes")]
    public List<DataType> DataTypes { get; set; }

    /// <summary>
    /// Gets or sets the different party types that are allowed to be owners of instances based on this application.
    /// </summary>
    [JsonProperty(PropertyName = "partyTypesAllowed")]
    public PartyTypesAllowed PartyTypesAllowed { get; set; }

    /// <summary>
    /// Gets or sets a property indicating if application instance should be automatically marked for hard deletion on process end.
    /// </summary>
    [JsonProperty(PropertyName = "autoDeleteOnProcessEnd")]
    public bool AutoDeleteOnProcessEnd { get; set; }

    /// <summary>
    /// Prevents the deletion of an instance for the specified number of days.
    /// This property takes precedence over the <see cref="AutoDeleteOnProcessEnd"/> property.
    /// </summary>
    [JsonProperty(PropertyName = "preventInstanceDeletionForDays")]
    public int? PreventInstanceDeletionForDays { get; set; }

    /// <summary>
    /// Gets or sets the presentation fields of the application.
    /// </summary>
    [JsonProperty(PropertyName = "presentationFields")]
    public List<DataField> PresentationFields { get; set; }

    /// <summary>
    /// Gets or sets the data fields of the application.
    /// The data for fields specified here will automatically be copied and populated on the <see cref="Instance"/> model as data values,
    /// making them easily available for routing or other needs without having to load the entire data set.
    /// </summary>
    [JsonProperty(PropertyName = "dataFields")]
    public List<DataField> DataFields { get; set; }

    /// <summary>
    /// Gets or sets the definition of eFormidling shipments related to the app.
    /// </summary>
    [JsonProperty(PropertyName = "eFormidling")]
    public EFormidlingContract EFormidling { get; set; }

    /// <summary>
    /// Gets or sets the "on entry" configuration of the app.
    /// </summary>
    [JsonProperty(PropertyName = "onEntry")]
    public OnEntryConfig OnEntry { get; set; }

    /// <summary>
    /// Gets or sets the messagebox configuration of the app.
    /// </summary>
    [JsonProperty(PropertyName = "messageBoxConfig")]
    public MessageBoxConfig MessageBoxConfig { get; set; }

    /// <summary>
    /// Gets or sets the copy instance settings
    /// </summary>
    [JsonProperty(PropertyName = "copyInstanceSettings")]
    public CopyInstanceSettings CopyInstanceSettings { get; set; }

    /// <summary>
    /// Gets or sets the API scopes configuration for the app
    /// </summary>
    [JsonProperty(PropertyName = "apiScopes")]
    public ApiScopesConfiguration ApiScopes { get; set; }

    /// <summary>
    /// Gets or sets an optional account number to use a different storage account than the default.
    /// </summary>
    [JsonProperty(PropertyName = "storageAccountNumber")]
    public int? StorageAccountNumber { get; set; }

    /// <summary>
    /// Gets or sets a boolean value indicating if users (user tokens) are disallowed from instantiating.
    /// Default value is <c>false</c>.
    /// </summary>
    /// <remarks>
    /// If set to true, only organisations/system users can instantiate apps, but users
    /// can still copy their own instances (if copying is enabled in the app).
    /// Note that this configuration only affects production environment (to make testing easier).
    /// </remarks>
    [JsonProperty(PropertyName = "disallowUserInstantiation")]
    public bool DisallowUserInstantiation { get; set; }

    /// <summary>
    /// Homepage of the application.
    /// </summary>
    [JsonProperty(PropertyName = "homepage")]
    public string Homepage { get; set; }

    /// <summary>
    /// Keywords/tags for the application.
    /// </summary>
    [JsonProperty(PropertyName = "keywords")]
    public List<Keyword> Keywords { get; set; }

    /// <summary>
    /// Description of the application.
    /// </summary>
    [JsonProperty(PropertyName = "description")]
    public Dictionary<string, string> Description { get; set; }

    /// <summary>
    /// Access related metadata for the application.
    /// </summary>
    [JsonProperty(PropertyName = "access")]
    public AppMetadataAccess Access { get; set; }

    /// <summary>
    /// Contact points for the application.
    /// </summary>
    [JsonProperty(PropertyName = "contactPoints")]
    public List<AppMetadataContactPoint> ContactPoints { get; set; }

    /// <inheritdoc/>
    public override string ToString()
    {
        return JsonConvert.SerializeObject(this);
    }
}

/// <summary>
/// Represents a container object with a list of applications.
/// </summary>
/// <remarks>
/// This should be used only when an API endpoint would otherwise return a list of applications.
/// Not when a list is a property of a separate class.
/// </remarks>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class ApplicationList
{
    /// <summary>
    /// The actual list of applications.
    /// </summary>
    [JsonProperty(PropertyName = "applications")]
    public List<Application> Applications { get; set; }
}

/// <summary>
/// Contact points for an application
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class AppMetadataContactPoint
{
    /// <summary>
    /// The category of the contact point.
    /// </summary>
    [JsonProperty(PropertyName = "category")]
    public string Category { get; set; }

    /// <summary>
    /// The email address of the contact point.
    /// </summary>
    [JsonProperty(PropertyName = "email")]
    public string Email { get; set; }

    /// <summary>
    /// The telephone number of the contact point.
    /// </summary>
    [JsonProperty(PropertyName = "telephone")]
    public string Telephone { get; set; }

    /// <summary>
    /// The contact page of the contact point.
    /// </summary>
    [JsonProperty(PropertyName = "contactPage")]
    public string ContactPage { get; set; }
}

/// <summary>
/// Access related metadata
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class AppMetadataAccess
{
    /// <summary>
    /// Description used to describe delegation of rights
    /// </summary>
    [JsonProperty(PropertyName = "rightDescription")]
    public Dictionary<string, string> RightDescription { get; set; }

    /// <summary>
    /// Whether the application supports delegation of rights to other users or not
    /// </summary>
    [JsonProperty(PropertyName = "delegable")]
    public bool Delegable { get; set; }

    /// <summary>
    /// Whether the application is visible to users or not when delegating
    /// </summary>
    [JsonProperty(PropertyName = "visible")]
    public bool Visible { get; set; }
}

/// <summary>
/// Keywords/tags for the application
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class Keyword
{
    /// <summary>
    /// The key word
    /// </summary>
    [JsonProperty(PropertyName = "word")]
    public string Word { get; set; }

    /// <summary>
    /// Language of the key word
    /// </summary>
    [JsonProperty(PropertyName = "language")]
    public string Language { get; set; }
}
