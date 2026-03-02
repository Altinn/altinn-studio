import { axiosInstance } from 'nextsrc/core/axiosInstance';

import type { ExpressionValidationConfig } from 'nextsrc/libs/form-client/expressionValidation';
import type { JSONSchema7 } from 'json-schema';
import type { ILayoutCollection } from 'src/layout/layout';

export class LayoutApi {
  public static async getLayout(layoutSetId: string) {
    return axiosInstance.get<ILayoutCollection>(`/api/layouts/${layoutSetId}`).then((response) => response.data);
  }

  public static async getDataModelSchema(dataType: string) {
    return axiosInstance.get<JSONSchema7>(`/api/jsonschema/${dataType}`).then((response) => response.data);
  }

  public static async getValidationConfig(dataTypeId: string): Promise<ExpressionValidationConfig | null> {
    try {
      const response = await axiosInstance.get<ExpressionValidationConfig>(
        `/api/validationconfig/${dataTypeId}`,
      );
      return response.data;
    } catch {
      return null;
    }
  }
}
