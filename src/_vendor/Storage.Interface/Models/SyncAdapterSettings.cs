#nullable disable

using System.ComponentModel;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// A class to hold sync adapter settings
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class SyncAdapterSettings
{
    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable all dialog synchronization.
    /// This overrides all other settings.
    /// </summary>
    [JsonProperty(PropertyName = "disableSync")]
    [DefaultValue(false)]
    public bool DisableSync { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should create a dialogId or use user-
    /// supplied dialogId. If true, the sync adapter will use the dialogId found in DataValues with key: dialog.id.
    /// </summary>
    [JsonProperty(PropertyName = "enableUserSuppliedDialogId")]
    [DefaultValue(false)]
    public bool EnableUserSuppliedDialogId { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable dialog creation.
    /// </summary>
    [JsonProperty(PropertyName = "disableCreate")]
    [DefaultValue(false)]
    public bool DisableCreate { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable dialog deletion.
    /// </summary>
    [JsonProperty(PropertyName = "disableDelete")]
    [DefaultValue(false)]
    public bool DisableDelete { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable adding activities.
    /// </summary>
    [JsonProperty(PropertyName = "disableAddActivities")]
    [DefaultValue(false)]
    public bool DisableAddActivities { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable adding transmissions.
    /// </summary>
    [JsonProperty(PropertyName = "disableAddTransmissions")]
    [DefaultValue(false)]
    public bool DisableAddTransmissions { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing (overwrite) the due at date.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncDueAt")]
    [DefaultValue(false)]
    public bool DisableSyncDueAt { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing (overwrite) the status.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncStatus")]
    [DefaultValue(false)]
    public bool DisableSyncStatus { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should set status to completed when confirmed.
    /// </summary>
    [JsonProperty(PropertyName = "disableMarkCompletedWhenConfirmed")]
    [DefaultValue(false)]
    public bool DisableMarkCompletedWhenConfirmed { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing (overwrite) the title.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncContentTitle")]
    [DefaultValue(false)]
    public bool DisableSyncContentTitle { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing (overwrite) the summary.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncContentSummary")]
    [DefaultValue(false)]
    public bool DisableSyncContentSummary { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing (overwrite) the additional information.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncContentAdditionalInformation")]
    [DefaultValue(false)]
    public bool DisableSyncContentAdditionalInformation { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing (overwrite) the extended status.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncContentExtendedStatus")]
    [DefaultValue(false)]
    public bool DisableSyncContentExtendedStatus { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing attachments at the dialog level.
    /// Will only add/remove attachments with recognized id's, which are derived from the URL.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncAttachments")]
    [DefaultValue(false)]
    public bool DisableSyncAttachments { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing API actions.
    /// Will only add/remove API actions with recognized id's, which are derived from the URL.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncApiActions")]
    [DefaultValue(false)]
    public bool DisableSyncApiActions { get; set; }

    /// <summary>
    /// Gets or sets the flag controlling whether the sync adapter should disable synchronizing GUI actions.
    /// Will only add/remove GUI actions with recognized id's, which are derived from the URL.
    /// </summary>
    [JsonProperty(PropertyName = "disableSyncGuiActions")]
    [DefaultValue(false)]
    public bool DisableSyncGuiActions { get; set; }
}
