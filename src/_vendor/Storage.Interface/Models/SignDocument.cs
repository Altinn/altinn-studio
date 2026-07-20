using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Signature document with list of signed/unsigned dataElements.
/// </summary>
public class SignDocument
{
    /// <summary>
    /// Unique id of the SignDocument (identical to dataElementId for this document).
    /// </summary>
    [JsonProperty(PropertyName = "id")]
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Instance guid.
    /// </summary>
    [JsonProperty(PropertyName = "instanceGuid")]
    [JsonPropertyName("instanceGuid")]
    public string InstanceGuid { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp for when the document was signed.
    /// </summary>
    [JsonProperty(PropertyName = "signedTime")]
    [JsonPropertyName("signedTime")]
    public DateTime SignedTime { get; set; }

    /// <summary>
    /// Information about the signee.
    /// </summary>
    [JsonProperty(PropertyName = "signeeInfo")]
    [JsonPropertyName("signeeInfo")]
    public Signee SigneeInfo { get; set; } = new Signee();

    /// <summary>
    /// List of dataElementSignatures.
    /// </summary>
    [JsonProperty(PropertyName = "dataElementSignatures")]
    [JsonPropertyName("dataElementSignatures")]
    public List<DataElementSignature> DataElementSignatures { get; set; } =
        new List<DataElementSignature>();

    /// <summary>
    /// The DataElementSignature.
    /// </summary>
    public class DataElementSignature
    {
        /// <summary>
        /// Id of the dataElement.
        /// </summary>
        [JsonProperty(PropertyName = "dataElementId")]
        [JsonPropertyName("dataElementId")]
        public string DataElementId { get; set; } = string.Empty;

        /// <summary>
        /// Sha256 hash of the dataelement.
        /// </summary>
        [JsonProperty(PropertyName = "sha256Hash")]
        [JsonPropertyName("sha256Hash")]
        public string Sha256Hash { get; set; } = string.Empty;

        /// <summary>
        /// Signing status for dataElement.
        /// </summary>
        [JsonProperty(PropertyName = "signed")]
        [JsonPropertyName("signed")]
        public bool Signed { get; set; }
    }
}
