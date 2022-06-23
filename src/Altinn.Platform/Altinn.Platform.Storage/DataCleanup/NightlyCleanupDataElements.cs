using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Platform.Storage.DataCleanup.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;

namespace Altinn.Platform.Storage.DataCleanup
{
    /// <summary>
    /// Azure Function class for deleting dataElements in nightly cleanup.
    /// </summary>
    public class NightlyCleanupDataElements
    {
        private readonly ICosmosService _cosmosService;
        private readonly IBlobService _blobService;
        private readonly IBackupBlobService _backupBlobService;

        /// <summary>
        /// Initializes a new instance of the <see cref="NightlyCleanup"/> class.
        /// </summary>
        /// <param name="cosmosService">The Cosmos DB service.</param>
        /// <param name="blobService">The blob service.</param>
        /// <param name="backupBlobService">The backup blob service.</param>
        public NightlyCleanupDataElements(ICosmosService cosmosService, IBlobService blobService, IBackupBlobService backupBlobService)
        {
            _cosmosService = cosmosService;
            _blobService = blobService;
            _backupBlobService = backupBlobService;
        }

        /// <summary>
        /// Runs nightly cleanup of deleted dataElements.
        /// </summary>
        /// <param name="timer">The trigger timer.</param>
        /// <param name="log">The log.</param>
        [FunctionName("NightlyCleanupDataElements")]
        public async Task Run([TimerTrigger("0 */5 * * * *", RunOnStartup = true)] TimerInfo timer, ILogger log)
        {
            List<DataElement> dataElements = await _cosmosService.GetHardDeletedDataElements();

            int successfullyDeleted = 0;

            Stopwatch stopwatch = new Stopwatch();
            stopwatch.Start();

            foreach (DataElement dataElement in dataElements)
            {
                bool dataBlobDeleted = false;
                bool dataElementsBackupDeleted = false;

                try
                {
                    dataBlobDeleted = await _blobService.DeleteDataBlob(dataElement);
                    dataElementsBackupDeleted = await _backupBlobService.DeleteDataElementBackup(dataElement.BlobStoragePath);
                    if (dataBlobDeleted && dataElementsBackupDeleted)
                    {
                        await _cosmosService.DeleteDataElementDocument(dataElement.SelfLinks.Platform, dataElement.InstanceGuid);
                        successfullyDeleted++;
                    }
                }
                catch (Exception e)
                {
                    log.LogError(e, $"NightlyCleanupDataElements // Run // Error occured when deleting dataElement Id: {dataElement.Id} Blobstoragepath: {dataElement.BlobStoragePath} \r Exception: {e.Message}");
                }
            }

            stopwatch.Stop();
            log.LogInformation(
                $"NightlyCleanupDataElements // Run // {successfullyDeleted} of {dataElements.Count} data elements deleted in {stopwatch.Elapsed.TotalSeconds} s");
        }
    }
}
