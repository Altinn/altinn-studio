using System.Text.Json.Serialization;

namespace Altinn.App.Core.EFormidling.Models;

/// <summary>
/// A page of message statuses reported by the eFormidling integrasjonspunkt.
/// </summary>
/// <remarks>
/// The integrasjonspunkt returns its status list paged. Only <see cref="Content"/> carries the
/// statuses themselves; the remaining properties describe the page and are preserved so the shape
/// matches the API response.
/// Ref: <see href="https://docs.digdir.no/eformidling_nm_restdocs.html"/>.
/// </remarks>
public sealed class Statuses
{
    /// <summary>
    /// The statuses on this page, oldest first in practice — though the API promises no ordering.
    /// </summary>
    [JsonPropertyName("content")]
    public List<Entry>? Content { get; set; }

    /// <summary>
    /// Describes the page this response represents.
    /// </summary>
    [JsonPropertyName("pageable")]
    public PageInfo? Pageable { get; set; }

    /// <summary>
    /// The total number of statuses across all pages.
    /// </summary>
    [JsonPropertyName("totalElements")]
    public int TotalElements { get; set; }

    /// <summary>
    /// Whether this is the last page.
    /// </summary>
    [JsonPropertyName("last")]
    public bool Last { get; set; }

    /// <summary>
    /// The total number of pages.
    /// </summary>
    [JsonPropertyName("totalPages")]
    public int TotalPages { get; set; }

    /// <summary>
    /// How the result set is sorted.
    /// </summary>
    [JsonPropertyName("sort")]
    public SortInfo? Sort { get; set; }

    /// <summary>
    /// The number of statuses returned on this page.
    /// </summary>
    [JsonPropertyName("numberOfElements")]
    public int NumberOfElements { get; set; }

    /// <summary>
    /// Whether this is the first page.
    /// </summary>
    [JsonPropertyName("first")]
    public bool First { get; set; }

    /// <summary>
    /// The page size.
    /// </summary>
    [JsonPropertyName("size")]
    public int Size { get; set; }

    /// <summary>
    /// The page number.
    /// </summary>
    [JsonPropertyName("number")]
    public int Number { get; set; }

    /// <summary>
    /// Whether the page is empty.
    /// </summary>
    [JsonPropertyName("empty")]
    public bool Empty { get; set; }

    /// <summary>
    /// A single status reported for a message.
    /// </summary>
    public sealed class Entry
    {
        /// <summary>
        /// The numeric message status id.
        /// </summary>
        [JsonPropertyName("id")]
        public int Id { get; set; }

        /// <summary>
        /// When the status was recorded.
        /// </summary>
        [JsonPropertyName("lastUpdate")]
        public DateTime LastUpdate { get; set; }

        /// <summary>
        /// The status value. One of <c>OPPRETTET</c>, <c>SENDT</c>, <c>MOTTATT</c>, <c>LEVERT</c>,
        /// <c>LEST</c>, <c>FEIL</c>, <c>ANNET</c>, <c>INNKOMMENDE_MOTTATT</c>,
        /// <c>INNKOMMENDE_LEVERT</c> or <c>LEVETID_UTLOPT</c>. The values seen in production are lower
        /// case, but the API promises nothing, so compare case-insensitively.
        /// </summary>
        [JsonPropertyName("status")]
        public string? Status { get; set; }

        /// <summary>
        /// A description of the status, typically carrying the error detail for a failure.
        /// </summary>
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        /// <summary>
        /// The numeric conversation id.
        /// </summary>
        [JsonPropertyName("convId")]
        public int ConvId { get; set; }

        /// <summary>
        /// The conversation id, typically a UUID.
        /// </summary>
        [JsonPropertyName("conversationId")]
        public string? ConversationId { get; set; }

        /// <summary>
        /// The message id, typically a UUID. Altinn apps use the instance guid.
        /// </summary>
        [JsonPropertyName("messageId")]
        public string? MessageId { get; set; }
    }

    /// <summary>
    /// How a result set is sorted.
    /// </summary>
    public sealed class SortInfo
    {
        /// <summary>
        /// Whether the result set is sorted.
        /// </summary>
        [JsonPropertyName("sorted")]
        public bool Sorted { get; set; }

        /// <summary>
        /// Whether the result set is unsorted.
        /// </summary>
        [JsonPropertyName("unsorted")]
        public bool Unsorted { get; set; }

        /// <summary>
        /// Whether no sorting was applied.
        /// </summary>
        [JsonPropertyName("empty")]
        public bool Empty { get; set; }
    }

    /// <summary>
    /// Describes a page of results.
    /// </summary>
    public sealed class PageInfo
    {
        /// <summary>
        /// How the page is sorted.
        /// </summary>
        [JsonPropertyName("sort")]
        public SortInfo? Sort { get; set; }

        /// <summary>
        /// The page number.
        /// </summary>
        [JsonPropertyName("pageNumber")]
        public int PageNumber { get; set; }

        /// <summary>
        /// The page size.
        /// </summary>
        [JsonPropertyName("pageSize")]
        public int PageSize { get; set; }

        /// <summary>
        /// The offset of this page within the full result set.
        /// </summary>
        [JsonPropertyName("offset")]
        public int Offset { get; set; }

        /// <summary>
        /// Whether the result set is paged.
        /// </summary>
        [JsonPropertyName("paged")]
        public bool Paged { get; set; }

        /// <summary>
        /// Whether the result set is unpaged.
        /// </summary>
        [JsonPropertyName("unpaged")]
        public bool Unpaged { get; set; }
    }
}
