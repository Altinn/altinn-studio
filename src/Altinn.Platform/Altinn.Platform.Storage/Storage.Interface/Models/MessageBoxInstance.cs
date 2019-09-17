using System;
using System.Runtime.Serialization;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Simplified instance class designed for Altinn 2 messagebox.
    /// </summary>
    public class MessageBoxInstance
    {
        /// <summary>
        /// Unique guid id of the instance.
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Owner of the instance.
        /// </summary>
        public string InstanceOwnerId { get; set; }

        /// <summary>
        /// Application owner for the app, should be lower case.
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Application name used to identfify application.
        /// </summary>
        public string AppName { get; set; }

        /// <summary>
        /// Application title for the instance.
        /// </summary>
        public string Title { get; set; }

        /// <summary>
        /// Current task in processState.
        /// </summary>
        public string ProcessCurrentTask { get; set; }

        /// <summary>
        /// Create date and time for the instance.
        /// </summary>
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// User id of the user who last changed the instance.
        /// </summary>
        public string LastChangedBy { get; set; }

        /// <summary>
        /// Due date to submit the instance to application owner.
        /// </summary>
        public DateTime? DueDateTime { get; set; }

        /// <summary>
        /// Delete status of instance; default or softDeleted.
        /// </summary>
        public DeleteStatusType DeleteStatus { get; set; }

        /// <summary>
        /// Boolean indicating if user is allowed to delete instance.
        /// </summary>
        public bool AllowDelete { get; set; }

        /// <summary>
        /// Boolean indicating if user is allowed to create a new copy from existing instance.
        /// </summary>
        public bool AllowNewCopy { get; set; }

        /// <summary>
        /// Boolean indicating if user is authorized to write on instance.
        /// </summary>
        public bool AuthorizedForWrite { get; set; }

        /// <summary>
        /// DateTime the instance was archived 
        /// </summary>
        public DateTime? ArchivedDateTime { get; set; }

        /// <summary>
        /// DateTime the instance was deleted
        /// </summary>
        public DateTime? DeletedDateTime { get; set; }
    }

    /// <summary>
    /// Status indicating the deletion status of an instance
    /// </summary>
    public enum DeleteStatusType : int
    {
        /// <summary>
        /// Default status, not soft deleted.
        /// </summary>
        [EnumMember]
        Default = 0,

        /// <summary>
        /// Instance has been soft deleted.
        /// </summary>
        [EnumMember]
        SoftDeleted = 1
    }
}
