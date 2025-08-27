export type WithDataAttributes<Props> = Props & DataAttributes;

type DataAttributes = Record<DataAttribute, string>;

type DataAttribute = `data-${string}`;
