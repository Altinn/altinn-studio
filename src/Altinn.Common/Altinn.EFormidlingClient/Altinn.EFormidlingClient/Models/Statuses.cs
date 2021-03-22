using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace Altinn.Common.EFormidlingClient.Models
{
    /// <summary>
    /// Entity representing Statuses. Initializes a new instance of the <see cref="Statuses"/> class.
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class Statuses
    {
        /// <summary>
        ///  Gets or sets the Content
        /// </summary>
        public List<Content> Content { get; set; }

        /// <summary>
        ///  Gets or sets the Pageable
        /// </summary>
        public Pageable Pageable { get; set; }

        /// <summary>
        ///  Gets or sets the TotalElements. The total number of elements
        /// </summary>
        public int TotalElements { get; set; }

        /// <summary>
        ///  Gets or sets the Last. A boolean value indicating if this is the last page or not.
        /// </summary>
        public bool Last { get; set; }

        /// <summary>
        ///  Gets or sets the TotalPages. The total number of pages
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        ///  Gets or sets the Sort
        /// </summary>
        public Sort Sort { get; set; }

        /// <summary>
        ///  Gets or sets the NumberOfElements. Number of elements returned in the page.
        /// </summary>
        public int NumberOfElements { get; set; }

        /// <summary>
        ///  Gets or sets the First. A boolean value indicating if this is the first page or not.   
        /// </summary>
        public bool First { get; set; }

        /// <summary>
        ///  Gets or sets the Size. The page size
        /// </summary>
        public int Size { get; set; }

        /// <summary>
        ///  Gets or sets the Number. The page number
        /// </summary>
        public int Number { get; set; }

        /// <summary>
        ///  Gets or sets the Empty. True if the page is empty. False if not.
        /// </summary>
        public bool Empty { get; set; }     
    }

    /// <summary>
    /// Entity representing Content. Initializes a new instance of the <see cref="Content"/> class.
    /// </summary>
    public class Content
    {
        /// <summary>
        ///  Gets or sets the Id. The numeric message status ID.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        ///  Gets or sets the LastUpdate. Date and time of status.
        /// </summary>
        public DateTime LastUpdate { get; set; }

        /// <summary>
        ///  Gets or sets the Status. The message status. Can be one of: OPPRETTET, SENDT, MOTTATT, LEVERT, LEST, FEIL, ANNET, INNKOMMENDE_MOTTATT, INNKOMMENDE_LEVERT, LEVETID_UTLOPT.
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        ///  Gets or sets the Description
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        ///  Gets or sets the ConvId. The numeric conversation ID.
        /// </summary>
        public int ConvId { get; set; }

        /// <summary>
        ///  Gets or sets the ConversationId. The numeric conversation ID.
        /// </summary>
        public string ConversationId { get; set; }

        /// <summary>
        ///  Gets or sets the MessageId. The messageId. Typically an UUID.
        /// </summary>
        public string MessageId { get; set; }    
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Sort"/> class.
    /// </summary>
    public class Sort
    {
        /// <summary>
        ///  Gets or sets the Sorted. True if the result set is sorted. False otherwise.
        /// </summary>
        public bool Sorted { get; set; }

        /// <summary>
        ///  Gets or sets the Unsorted. True if the result set is unsorted. False otherwise.
        /// </summary>
        public bool Unsorted { get; set; }

        /// <summary>
        ///  Gets or sets the Empty. True if no sorting. False otherwise
        /// </summary>
        public bool Empty { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Pageable"/> class.
    /// </summary>
    public class Pageable
    {
        /// <summary>
        ///  Gets or sets the Sort
        /// </summary>
        public Sort Sort { get; set; }

        /// <summary>
        ///  Gets or sets the PageNumber
        /// </summary>
        public int PageNumber { get; set; }

        /// <summary>
        ///  Gets or sets the PageSize
        /// </summary>
        public int PageSize { get; set; }

        /// <summary>
        ///  Gets or sets the Offset. The offset to be taken according to the underlying page and page size.
        /// </summary>
        public int Offset { get; set; }

        /// <summary>
        ///  Gets or sets the Paged
        /// </summary>
        public bool Paged { get; set; }

        /// <summary>
        ///  Gets or sets the Unpaged
        /// </summary>
        public bool Unpaged { get; set; }
    }
}
