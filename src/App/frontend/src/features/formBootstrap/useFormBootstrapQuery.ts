import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { skipToken, useQuery } from 'src/core/queries/reactQuery';
import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { resolveExpressionValidationConfig } from 'src/features/customValidation/customValidationUtils';
import { SchemaLookupTool } from 'src/features/datamodel/SchemaLookupTool';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { createValidator } from 'src/features/validation/schemaValidation/schemaValidationUtils';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { QueryClient } from 'src/core/queries/reactQuery';
import type {
  FormBootstrapResponse,
  ProcessedDataModelInfo,
  RawDataModelInfo,
  StaticOptionSet,
} from 'src/features/formBootstrap/types';
import type { BackendValidationIssue } from 'src/features/validation';

export interface FormBootstrapQueryOptions {
  enabled: boolean;
  uiFolder: string | undefined;
  dataElementId?: string;
  prefill?: string;
}

export interface FormBootstrapQueryResponse extends Omit<FormBootstrapResponse, 'dataModels' | 'staticOptions'> {
  dataModels: ReturnType<typeof processDataModels>;
  staticOptions: ReturnType<typeof processStaticOptions>;
  allInitialValidations: BackendValidationIssue[];
}

interface FormBootstrapQueryKeyArgs {
  options: FormBootstrapQueryOptions;
  isStateless: boolean;
  instanceId: string | undefined;
  isPdf: boolean;
  language: string;
}

const formBootstrapQueryKeys = {
  all: () => ['formBootstrap'] as const,
  withParams: ({ options, isStateless, instanceId, isPdf, language }: FormBootstrapQueryKeyArgs) =>
    [
      ...formBootstrapQueryKeys.all(),
      options,
      isStateless ? 'stateless' : 'instance',
      instanceId,
      isPdf,
      language,
    ] as const,
};

export async function invalidateFormBootstrapQueries(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: formBootstrapQueryKeys.all() });
}

export function useFormBootstrapQuery(options: FormBootstrapQueryOptions) {
  const { fetchFormBootstrapForStateless, fetchFormBootstrapForInstance } = useAppQueries();
  const isStateless = useIsStateless();
  const instanceId = useLaxInstanceId();
  const language = useCurrentLanguage();
  const isPdf = useIsPdf();

  const enabled = options.enabled && options.uiFolder && (isStateless || !!instanceId);

  return useQuery<FormBootstrapQueryResponse>({
    queryKey: formBootstrapQueryKeys.withParams({ options, isStateless, instanceId, isPdf, language }),
    queryFn: enabled
      ? async () => {
          const raw = isStateless
            ? await fetchFormBootstrapForStateless({ uiFolder: options.uiFolder!, language, prefill: options.prefill })
            : await fetchFormBootstrapForInstance({
                instanceId: instanceId!,
                uiFolder: options.uiFolder!,
                dataElementId: options?.dataElementId,
                pdf: isPdf,
                language,
              });

          return {
            ...raw,
            dataModels: processDataModels(raw.dataModels),
            staticOptions: processStaticOptions(raw.staticOptions),
            allInitialValidations: [
              ...(raw.validationIssues ?? []),
              ...Object.values(raw.dataModels).flatMap((dataModel) => dataModel.initialValidationIssues ?? []),
            ],
          };
        }
      : skipToken,
    staleTime: 0,
    gcTime: 0,
  });
}

function processDataModels(
  dataModels: Record<string, RawDataModelInfo> | undefined,
): Record<string, ProcessedDataModelInfo> {
  if (!dataModels) {
    return {};
  }

  const appMetadata = getApplicationMetadata();
  return Object.fromEntries(
    Object.entries(dataModels).map(([dataType, value]) => {
      const dataTypeDef = appMetadata.dataTypes.find((dt) => dt.id === dataType);
      const rootElementPath = getRootElementPath(value.schema, dataTypeDef);
      const lookupTool = new SchemaLookupTool(value.schema, rootElementPath);
      const validator = createValidator(value.schema);

      return [
        dataType,
        {
          ...value,
          expressionValidationConfig: value.expressionValidationConfig
            ? resolveExpressionValidationConfig(value.expressionValidationConfig)
            : null,
          schemaResult: {
            schema: value.schema,
            rootElementPath,
            lookupTool,
            validator,
          },
        } satisfies ProcessedDataModelInfo,
      ];
    }),
  );
}

function processStaticOptions(staticOptions: Record<string, StaticOptionSet> | undefined) {
  if (!staticOptions) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(staticOptions).map(([optionsId, optionSet]) => [
      optionsId,
      {
        options: castOptionsToStrings(optionSet.options),
        downstreamParameters: optionSet.downstreamParameters,
      },
    ]),
  );
}
