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
        /// Initializes a new instance of the <see cref="Statuses"/> class.
        /// </summary>
        /// <param name="content">Content</param>
        /// <param name="pageable">Pageable</param>
        /// <param name="totalElements">TotalElements</param>
        /// <param name="last">Last</param>
        /// <param name="totalPages">TotalPages</param>
        /// <param name="sort">Sort</param>
        /// <param name="numberOfElements">NumerOfElements</param>
        /// <param name="first">First</param>
        /// <param name="size">Size</param>
        /// <param name="number">Number</param>
        /// <param name="empty">Empty</param>
        public Statuses(List<Content> content, Pageable pageable, int totalElements, bool last, int totalPages, Sort sort, int numberOfElements, bool first, int size, int number, bool empty)
        {
            this.Content = content;
            this.Pageable = pageable;
            this.TotalElements = totalElements;
            this.Last = last;
            this.TotalPages = totalPages;
            this.Sort = sort;
            this.NumberOfElements = numberOfElements;
            this.First = first;
            this.Size = size;
            this.Number = number;
            this.Empty = empty;
        }

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
        /// Initializes a new instance of the <see cref="Content"/> class.
        /// </summary>
        /// <param name="id">Id</param>
        /// <param name="lastUpdate">LastUpdate</param>
        /// <param name="status">Status</param>
        /// <param name="description">Description</param>
        /// <param name="convId">ConvId</param>
        /// <param name="conversationId">ConversationId</param>
        /// <param name="messageId">MessageId</param>
        public Content(int id, DateTime lastUpdate, string status, string description, int convId, string conversationId, string messageId)
        {
            Id = id;
            LastUpdate = lastUpdate;
            Status = status;
            Description = description;
            ConvId = convId;
            ConversationId = conversationId;
            MessageId = messageId;
        }

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
        /// Initializes a new instance of the <see cref="Sort"/> class.
        /// </summary>
        /// <param name="sorted">Sorted</param>
        /// <param name="unsorted">Unsorted</param>
        /// <param name="empty">Empty</param>
        public Sort(bool sorted, bool unsorted, bool empty)
        {
            Sorted = sorted;
            Unsorted = unsorted;
            Empty = empty;
        }

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
        /// Initializes a new instance of the <see cref="Pageable"/> class.
        /// </summary>
        /// <param name="sort">Sort</param>
        /// <param name="pageNumber">PageNumber</param>
        /// <param name="pageSize">PageSize</param>
        /// <param name="offset">Offset</param>
        /// <param name="paged">Paged</param>
        /// <param name="unpaged">Unpaged</param>
        public Pageable(Sort sort, int pageNumber, int pageSize, int offset, bool paged, bool unpaged)
        {
            Sort = sort;
            PageNumber = pageNumber;
            PageSize = pageSize;
            Offset = offset;
            Paged = paged;
            Unpaged = unpaged;
        }

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
