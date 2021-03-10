using System;
using System.Collections.Generic;

namespace Altinn.Common.EFormidlingClient.Models
{
    /// <summary>
    /// Entity representing Statuses. Initializes a new instance of the <see cref="Statuses"/> class.
    /// </summary>
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
        ///  Gets or sets the TotalElements
        /// </summary>
        public int TotalElements { get; set; }

        /// <summary>
        ///  Gets or sets the Last
        /// </summary>
        public bool Last { get; set; }

        /// <summary>
        ///  Gets or sets the TotalPages
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        ///  Gets or sets the Sort
        /// </summary>
        public Sort Sort { get; set; }

        /// <summary>
        ///  Gets or sets the NumberOfElements
        /// </summary>
        public int NumberOfElements { get; set; }

        /// <summary>
        ///  Gets or sets the First
        /// </summary>
        public bool First { get; set; }

        /// <summary>
        ///  Gets or sets the Size
        /// </summary>
        public int Size { get; set; }

        /// <summary>
        ///  Gets or sets the Number
        /// </summary>
        public int Number { get; set; }

        /// <summary>
        ///  Gets or sets the Empty
        /// </summary>
        public bool Empty { get; set; }     
    }

    /// <summary>
    /// Entity representing Content. Initializes a new instance of the <see cref="Content"/> class.
    /// </summary>
    public class Content
    {
        /// <summary>
        ///  Gets or sets the Id
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        ///  Gets or sets the LastUpdate
        /// </summary>
        public DateTime LastUpdate { get; set; }

        /// <summary>
        ///  Gets or sets the Status
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        ///  Gets or sets the Description
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        ///  Gets or sets the ConvId
        /// </summary>
        public int ConvId { get; set; }

        /// <summary>
        ///  Gets or sets the ConversationId
        /// </summary>
        public string ConversationId { get; set; }

        /// <summary>
        ///  Gets or sets the MessageId
        /// </summary>
        public string MessageId { get; set; }    
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Sort"/> class.
    /// </summary>
    public class Sort
    {
        /// <summary>
        ///  Gets or sets the Sorted
        /// </summary>
        public bool Sorted { get; set; }

        /// <summary>
        ///  Gets or sets the Unsorted
        /// </summary>
        public bool Unsorted { get; set; }

        /// <summary>
        ///  Gets or sets the Empty
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
        ///  Gets or sets the Offset
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
