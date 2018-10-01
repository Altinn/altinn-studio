using System.Collections.Generic;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Api;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// Helper for Model binding
    /// </summary>
    public static class ModelHelper
    {
        /// <summary>
        /// Given a input with indexes, return the full path without indexes
        /// </summary>
        /// <param name="forName">Path with indexes</param>
        /// <returns>Path without indexes</returns>
        public static string GetMetadataModelPath(string forName)
        {
            if (!forName.Contains("["))
            {
                return forName;
            }

            bool hasIndex = true;

            while (hasIndex)
            {
                int startIndex = forName.IndexOf("[");
                int stopIndex = forName.IndexOf("]", startIndex);

                if (stopIndex > 0)
                {
                    forName = forName.Remove(startIndex, (stopIndex - startIndex) + 1);

                    //In case of group in group
                    if (!forName.Contains("["))
                    {
                        hasIndex = false;
                    }
                }
                else
                {
                    // Should not happen. Stops the iteration so it does not create a eternal loop
                    hasIndex = false;
                }
            }

            return forName;
        }

        public static void MapModelStateToApiResult(ModelStateDictionary modelState, ApiResult apiResult, ServiceContext serviceContext)
        {
            apiResult.ModelStateEntries = new List<ApiModelStateEntry>();
            foreach (string modelKey in modelState.Keys)
            {
                ApiModelStateEntry apiEntry = null;
                modelState.TryGetValue(modelKey, out ModelStateEntry entry);

                if (entry != null && entry.ValidationState == ModelValidationState.Invalid)
                {
                    apiEntry = new ApiModelStateEntry
                    {
                        Key = modelKey,
                        ValidationState = (ApiModelValidationState)(int)entry.ValidationState,
                        Errors = new List<ApiModelError>()
                    };
                    foreach (ModelError error in entry.Errors)
                    {
                        apiEntry.Errors.Add(new ApiModelError() { ErrorMessage = ServiceTextHelper.GetServiceText(error.ErrorMessage, serviceContext.ServiceText, null, "nb-NO") });
                    }

                    apiResult.ModelStateEntries.Add(apiEntry);
                    apiResult.Status = ApiStatusType.ContainsError;
                }
            }
        }
    }
}
