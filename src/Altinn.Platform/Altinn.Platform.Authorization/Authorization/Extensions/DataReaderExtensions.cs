using System;
using System.Data;

namespace Altinn.Platform.Authorization.Extensions
{
    /// <summary>
    /// This class contains a set of extension methods for the <see cref="IDataReader"/> interface.
    /// </summary>
    public static class DataReaderExtensions
    {
        /// <summary>
        /// Gets a value from the current record of the given data reader, or the default value 
        /// for the given type <typeparamref name="T"/> if the reader value is <see cref="DBNull.Value"/>.
        /// </summary>
        /// <typeparam name="T">Type of value to retrieve.</typeparam>
        /// <param name="reader">Data reader positioned at a row.</param>
        /// <param name="colName">The column to get data from.</param>
        /// <returns>The reader value when present, otherwise the default value.</returns>
        public static T GetValue<T>(this IDataReader reader, string colName)
        {
            return GetValue<T>(reader, colName, default(T));
        }

        /// <summary>
        /// Gets a value from the current record of the given data reader, or the given default value 
        /// if the reader value is <see cref="DBNull.Value"/>.
        /// </summary>
        /// <typeparam name="T">Type of value to retrieve.</typeparam>
        /// <param name="reader">Data reader positioned at a row.</param>
        /// <param name="colName">The column to get data from.</param>
        /// <param name="defaultValue">Default value to use if the reader value is <see cref="DBNull.Value"/>.</param>
        /// <returns>The reader value when present, otherwise the given default value.</returns>
        public static T GetValue<T>(this IDataReader reader, string colName, T defaultValue)
        {
            object dbValue = reader[colName];
            try
            {
                if (dbValue is T value)
                {
                    return value;
                }

                if (dbValue == DBNull.Value)
                {
                    return defaultValue;
                }

                if (typeof(T).IsEnum)
                {
                    if (dbValue is int)
                    {
                        return (T)dbValue;
                    }
                    else
                    {
                        return (T)Enum.Parse(typeof(T), dbValue.ToString());
                    }
                }

                if (typeof(T).IsGenericType && typeof(T).GetGenericTypeDefinition() == typeof(Nullable<>))
                {
                    return (T)dbValue;
                }

                return (T)Convert.ChangeType(dbValue, typeof(T));
            }
            catch (Exception ex)
            {
                const string Message
                    = "Error trying to interpret data in column '{0}'. The reader value is '{1}', of type '{2}'. "
                    + "Attempt to interpret the value as type '{3}' failed.";

                string strVal = dbValue.ToString();
                if (strVal.Length > 100)
                {
                    strVal = string.Format($"{strVal.Substring(0, 100)} (truncated; length={strVal.Length}).");
                }

                throw new InvalidCastException(string.Format(Message, colName, strVal, dbValue.GetType(), typeof(T)), ex);
            }
        }
    }
}
