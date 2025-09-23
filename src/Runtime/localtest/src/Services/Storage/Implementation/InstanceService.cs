using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Services
{
    /// <summary>
    /// Service class with business logic related to instances.
    /// </summary>
    public class InstanceService : IInstanceService
    {
        private readonly IInstanceRepository _instanceRepository;
        private readonly IDataService _dataService;
        private readonly IApplicationService _applicationService;
        private readonly IInstanceEventService _instanceEventService;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceService"/> class.
        /// </summary>
        public InstanceService(IInstanceRepository instanceRepository, IDataService dataService, IApplicationService applicationService, IInstanceEventService instanceEventService)
        {
            _instanceRepository = instanceRepository;
            _dataService = dataService;
            _applicationService = applicationService;
            _instanceEventService = instanceEventService;
        }

        /// <inheritdoc/>
        public async Task<(bool Created, ServiceError ServiceError)> CreateSignDocument(int instanceOwnerPartyId, Guid instanceGuid, SignRequest signRequest, string performedBy)
        {
            Instance instance = await _instanceRepository.GetOne(instanceOwnerPartyId, instanceGuid);
            if (instance == null)
            {
                return (false, new ServiceError(404, "Instance not found"));
            }

            (bool validDataType, ServiceError serviceError) = await _applicationService.ValidateDataTypeForApp(instance.Org, instance.AppId, signRequest.SignatureDocumentDataType, instance.Process.CurrentTask?.ElementId);
            if (!validDataType)
            {
                return (false, serviceError);
            }

            SignDocument signDocument = GetSignDocument(instanceGuid, signRequest);

            foreach (SignRequest.DataElementSignature dataElementSignature in signRequest.DataElementSignatures)
            {
                (string base64Sha256Hash, serviceError) = await _dataService.GenerateSha256Hash(instance.Org, instanceGuid, Guid.Parse(dataElementSignature.DataElementId));
                if (string.IsNullOrEmpty(base64Sha256Hash))
                {
                    return (false, serviceError);
                }

                signDocument.DataElementSignatures.Add(new SignDocument.DataElementSignature
                {
                    DataElementId = dataElementSignature.DataElementId,
                    Sha256Hash = base64Sha256Hash,
                    Signed = dataElementSignature.Signed
                });
            }

            DataElement dataElement = DataElementHelper.CreateDataElement(
                signRequest.SignatureDocumentDataType,
                null,
                instance,
                signDocument.SignedTime,
                "application/json",
                $"{signRequest.SignatureDocumentDataType}.json",
                0,
                performedBy,
                signRequest.GeneratedFromTask);

            signDocument.Id = dataElement.Id;

            using (MemoryStream fileStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(signDocument, Formatting.Indented))))
            {
                await _dataService.UploadDataAndCreateDataElement(instance.Org, fileStream, dataElement);
            }

            await _instanceEventService.DispatchEvent(InstanceEventType.Signed, instance);
            return (true, null);
        }

        private static SignDocument GetSignDocument(Guid instanceGuid, SignRequest signRequest)
        {
            SignDocument signDocument = new SignDocument
            {
                InstanceGuid = instanceGuid.ToString(),
                SignedTime = DateTime.UtcNow,
                SigneeInfo = new Signee
                {
                    UserId = signRequest.Signee.UserId,
                    PersonNumber = signRequest.Signee.PersonNumber,
                    OrganisationNumber = signRequest.Signee.OrganisationNumber
                }
            };

            return signDocument;
        }
    }
}