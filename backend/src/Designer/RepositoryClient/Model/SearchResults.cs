using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.RepositoryClient.Model
{
    /// <summary>
    /// SearchResults results of a successful search
    /// </summary>
    [DataContract]
    public partial class SearchResults : IEquatable<SearchResults>, IValidatableObject
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="SearchResults"/> class.
        /// </summary>
        public SearchResults()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="SearchResults" /> class.
        /// </summary>
        /// <param name="data">Data.</param>
        /// <param name="ok">Ok.</param>
        public SearchResults(List<Repository> data = default(List<Repository>), bool? ok = default(bool?))
        {
            this.Data = data;
            this.Ok = ok;
        }

        /// <summary>
        /// Gets or Sets Data
        /// </summary>
        [JsonProperty("data")]
        public List<Repository> Data { get; set; }

        /// <summary>
        /// Gets or Sets Ok
        /// </summary>
        [JsonProperty("ok")]
        public bool? Ok { get; set; }

        /// <summary>
        /// Gets or Sets TotalCount
        /// </summary>
        [JsonProperty("totalCount")]
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or Sets TotalPages
        /// </summary>
        [JsonProperty("totalPages")]
        public int TotalPages { get; set; }

        /// <summary>
        /// Returns the string presentation of the object
        /// </summary>
        /// <returns>String presentation of the object</returns>
        public override string ToString()
        {
            var sb = new StringBuilder();
            sb.Append("class SearchResults {\n");
            sb.Append("  Data: ").Append(Data).Append("\n");
            sb.Append("  Ok: ").Append(Ok).Append("\n");
            sb.Append("}\n");
            return sb.ToString();
        }

        /// <summary>
        /// Returns true if objects are equal
        /// </summary>
        /// <param name="obj">Object to be compared</param>
        /// <returns>Boolean</returns>
        public override bool Equals(object obj)
        {
            return this.Equals(obj as SearchResults);
        }

        /// <summary>
        /// Returns true if SearchResults instances are equal
        /// </summary>
        /// <param name="other">Instance of SearchResults to be compared</param>
        /// <returns>Boolean</returns>
        public bool Equals(SearchResults other)
        {
            if (other == null)
            {
                return false;
            }

            return
                (
                    this.Data == other.Data ||
                    (this.Data != null &&
                    this.Data.SequenceEqual(other.Data))) &&
                (
                    this.Ok == other.Ok ||
                    (this.Ok != null &&
                    this.Ok.Equals(other.Ok)));
        }

        /// <summary>
        /// Gets the hash code
        /// </summary>
        /// <returns>Hash code</returns>
        public override int GetHashCode()
        {
            // Overflow is fine, just wrap
            unchecked
            {
                int hashCode = 41;
                if (this.Data != null)
                {
                    hashCode = (hashCode * 59) + this.Data.GetHashCode();
                }

                if (this.Ok != null)
                {
                    hashCode = (hashCode * 59) + this.Ok.GetHashCode();
                }

                return hashCode;
            }
        }

        /// <summary>
        /// To validate all properties of the instance
        /// </summary>
        /// <param name="validationContext">Validation context</param>
        /// <returns>Validation Result</returns>
        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            yield break;
        }
    }
}
