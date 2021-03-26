using System.Collections.Generic;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Common.Models
{
    /// <summary>
    /// The result of a calculation 
    /// </summary>
    public class CalculationResult : DataElement
    {
        /// <summary>
        /// Creates a instance of CalculationResult
        /// </summary>
        public CalculationResult()
        {
        }

        /// <summary>
        /// Creates a instance of CalculationResult
        /// </summary>
        /// <param name="dataElement">The DataElement base object</param>
        public CalculationResult(DataElement dataElement)
        {
            MapDataElementToCalculationResult(dataElement);
        }

        /// <summary>
        /// Creates an instance of CalculationResult
        /// </summary>
        /// <param name="dataElement">The DataElement base object</param>
        /// <param name="changedFields">The changed fields</param>
        public CalculationResult(DataElement dataElement, Dictionary<string, object> changedFields)
        {
            MapDataElementToCalculationResult(dataElement);
            ChangedFields = changedFields;
        }

        /// <summary>
        /// The key-value pair of fields changed by a calculation
        /// </summary>
        public Dictionary<string, object> ChangedFields { get; set; }

        private void MapDataElementToCalculationResult(DataElement dataElement)
        {
            BlobStoragePath = dataElement.BlobStoragePath;
            ContentType = dataElement.ContentType;
            Created = dataElement.Created;
            CreatedBy = dataElement.CreatedBy;
            DataType = dataElement.DataType;
            Filename = dataElement.Filename;
            Id = dataElement.Id;
            InstanceGuid = dataElement.InstanceGuid;
            IsRead = dataElement.IsRead;
            LastChanged = dataElement.LastChanged;
            LastChangedBy = dataElement.LastChangedBy;
            Locked = dataElement.Locked;
            Refs = dataElement.Refs;
            SelfLinks = dataElement.SelfLinks;
            Size = dataElement.Size;
        }
    }
}
