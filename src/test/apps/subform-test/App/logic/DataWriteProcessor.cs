using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Models.model;

namespace Altinn.App.logic
{
    public class DataWriteProcessor : IDataWriteProcessor
    {
        private model _model;

        public async Task ProcessDataWrite(
            IInstanceDataMutator instanceDataMutator,
            string taskId,
            DataElementChanges changes,
            string language)
        {
            foreach (var binaryChange in changes.BinaryDataChanges)
            {
                // Maintain our own field with backend-maintained attachment ids. This is to ultimately compare
                // with the attachment ids that the frontend sets.
                if (binaryChange.DataType.Id == "attachments")
                {
                    if (binaryChange.Type == ChangeType.Created)
                    {
                        if (binaryChange.FileName == "idontcare.png")
                        {
                            instanceDataMutator.AbandonAllChanges([new ValidationIssue
                            {
                                Field = "AttachmentId",
                                Description = "You cannot upload a file named idontcare.png",
                                Severity = ValidationIssueSeverity.Error
                            }]);
                            return;
                        }

                        var formData = await GetModel(instanceDataMutator);
                        formData.AttachmentName ??= new List<string>();
                        formData.AttachmentName.Add(binaryChange.FileName);
                    }
                    else if (binaryChange.Type == ChangeType.Deleted)
                    {
                        var formData = await GetModel(instanceDataMutator);
                        formData.AttachmentName?.Remove(binaryChange.FileName);
                    }
                }
            }

            if (_model != null)
            {
                _model.AttachmentIdJoined = string.Join(", ", _model.AttachmentId); // Updated by frontend
                _model.AttachmentNameJoined = string.Join(", ", _model.AttachmentName); // Updated by backend
            }

            foreach (var formDataChange in changes.FormDataChanges)
            {
                if (formDataChange.DataType.Id == "model")
                {
                    var formData = formDataChange.CurrentFormData as model;
                    formData.AttachmentId ??= new List<string>();
                    var joined = string.Join(", ", formData.AttachmentId);
                    if (joined != formData.AttachmentIdJoined)
                    {
                        // We intentionally mix where we get the data model from, to show that it can be done in
                        // different ways without conflicting with each other. Above we get the model from the
                        // instanceDataMutator, here we get it from the formDataChange, but both reference the
                        // same object.
                        formData.AttachmentIdJoined = joined;
                    }

                    if (formData.Navn != null && formData.Navn.StartsWith("debug"))
                    {
                        // Just because it's possible, we can now implement a very silly command-like interface
                        // in this input field. This is also useful to test that form-data changes can affect
                        // attachments.
                        //
                        // Syntax is:
                        // - "debug" -> shows hidden fields in the frontend
                        // - "debug,delete,<name>" -> deletes an attachment by name, resets the name field
                        // - "debug,<anything else>" -> does nothing, resets the name field to an error

                        if (formData.Navn.StartsWith("debug,delete,"))
                        {
                            var name = formData.Navn.Substring("debug,delete,".Length);
                            foreach (var element in instanceDataMutator.Instance.Data)
                            {
                                if (element.DataType == "attachments" && element.Filename == name)
                                {
                                    instanceDataMutator.RemoveDataElement(element);
                                    formData.AttachmentName.Remove(name);
                                    // We should update the IDs here as well, but not doing it here forces frontend
                                    // to update the IDs. Leaving it out allows us to test that it happens correctly.
                                }
                            }
                            formData.AttachmentNameJoined = string.Join(", ", formData.AttachmentName);
                            formData.Navn = "debug";
                        } else if (formData.Navn != "debug")
                        {
                            formData.Navn = "debug,invalid command";
                        }
                    }
                }
            }
        }

        private async Task<model> GetModel(IInstanceDataMutator instanceDataMutator)
        {
            if (_model == null)
            {
                var elements = instanceDataMutator.GetDataElementsForType("model");
                foreach (var element in elements)
                {
                    _model = await instanceDataMutator.GetFormData<model>(element);
                    break;
                }
            }

            return _model;
        }
    }
}