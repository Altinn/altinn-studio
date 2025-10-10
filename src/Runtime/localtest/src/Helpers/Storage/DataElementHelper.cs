using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// DataElement helper methods
    /// </summary>
    public static class DataElementHelper
    {
        /// <summary>
        /// Creates a data element based on element type, instance id, content type, content file name and file size. 
        /// </summary>
        /// <returns>DataElement</returns>
        public static DataElement CreateDataElement(string dataType, List<Guid> refs, Instance instance, DateTime creationTime, string contentType, string contentFileName, long fileSize, string user, string generatedFromTask)
        {
            string dataId = Guid.NewGuid().ToString();

            string guidFromInstanceId = instance.Id;

            if (guidFromInstanceId != null && guidFromInstanceId.Contains("/"))
            {
                guidFromInstanceId = instance.Id.Split("/")[1];
            }

            DataElement newData = new DataElement
            {
                // update data record
                Id = dataId,
                InstanceGuid = guidFromInstanceId,
                DataType = dataType,
                ContentType = contentType,
                CreatedBy = user,
                Created = creationTime,
                Filename = contentFileName,
                LastChangedBy = user,
                LastChanged = creationTime,
                Size = fileSize,
                Refs = refs,
            };

            if (!String.IsNullOrEmpty(generatedFromTask))
            {
                newData.References = new List<Reference>()
                {
                    new Reference
                    {
                        Relation = Interface.Enums.RelationType.GeneratedFrom,
                        Value = generatedFromTask,
                        ValueType = Interface.Enums.ReferenceType.Task
                    }
                };
            }

            string filePath = DataFileName(instance.AppId, guidFromInstanceId, newData.Id);
            newData.BlobStoragePath = filePath;
            return newData;
        }

        /// <summary>
        /// Formats a filename for blob storage.
        /// </summary>
        public static string DataFileName(string appId, string instanceGuid, string dataElementId)
        {
            return $"{appId}/{instanceGuid}/data/{dataElementId}";
        }
    }
}
