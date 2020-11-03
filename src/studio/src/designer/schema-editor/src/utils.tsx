import React from 'react';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';
import { TransitionProps } from '@material-ui/core/transitions';
import Collapse from '@material-ui/core/Collapse';
import { useSpring, animated } from 'react-spring/web.cjs'; // web.cjs is required for IE 11 support

const JsonPointer = require('jsonpointer');

export function updateObject(obj: any, path: string, value: string) {
  if (path.startsWith('#')) {
    path = path.substr(1);
  }

  JsonPointer.set(obj, path, value);
}

export function createDataArray(
  schema: any,
  schemaPath: string,
  uiPath: string,
  mainSchema?: any,
  requiredArray?: string[]
): any[] {
  const result: any[] = [];
  mainSchema = mainSchema || schema;
  let path = schemaPath.startsWith('#') ? schemaPath.substr(1) : schemaPath;
  const required = requiredArray || schema.required;
  Object.keys(schema).forEach((key) => {
    if (typeof schema[key] === 'object' && schema[key] !== null) {
      if (key === 'properties') {
        const propArray = createDataArray(
          schema[key], `${schemaPath}/${key}`, uiPath, mainSchema, required);
        propArray.forEach((property) => {
          result.push(property);
        })
      } else if (key !== 'definitions' && key !== 'required') {
        result.push({
          id: key,
          uiPath,
          schemaPath: path || '/',
          value: createDataArray(
            schema[key], `${schemaPath}/${key}`, `${uiPath}/${key}`, mainSchema),
          $ref: schema[key].$ref || undefined,
          requiredPath: required && required.find((k: string) => k === key) ?
          schemaPath.replace('properties', 'required') : undefined,
        });
      }
    } else {
      if (key === '$ref') {
        const refPath = schema[key].startsWith('#') ? schema[key].substr(1) : schema[key];
        const subSchema = JsonPointer.get(mainSchema, refPath);
        const content = createDataArray(subSchema, schema[key], uiPath, mainSchema);
        content.forEach((item) => {
          result.push(item);
        });
      } else {
        result.push({
          id: key,
          uiPath,
          schemaPath: path || '/',
          value: schema[key],
        });
      }
    }
  });

  return result;
}

export function getUiSchemaItem(schema: any[], pathArray: string[], index: number): any {
  const pathSegment = pathArray[index];
  console.log('path segment: ', pathSegment);
  const item = schema.find((schemaItem) => schemaItem.id === pathSegment);
  console.log('item: ', item);
  if (item && Array.isArray(item.value) && index < pathArray.length - 1) {
    return getUiSchemaItem(item.value, pathArray, ++index);
  }

  return item;
}

export function buildJsonSchema(uiSchema: any[], result: any): any {
  const test = {};
  uiSchema.forEach((item) => {
    console.log(item.id);
    const path = item.schemaPath.endsWith('/') ? `${item.schemaPath}${item.id}` : `${item.schemaPath}/${item.id}`;
    let itemToSet: any;
    if (item.$ref) {
      itemToSet = {
        $ref: item.$ref
      }
      JsonPointer.set(result, path, itemToSet);
    }

    if (item.requiredPath) {
      JsonPointer.set(result, `${item.requiredPath}/-`, item.id);
    }

    if (Array.isArray(item.value)) {
      buildJsonSchema(item.value, result);
    } else {
      JsonPointer.set(result, path, item.value);
      JsonPointer.set(test, path, item.value);
    }
  });
}

export function MinusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z" />
    </SvgIcon>
  );
}

export function PlusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z" />
    </SvgIcon>
  );
}

export function CloseSquare(props: SvgIconProps) {
  return (
    <SvgIcon className="close" fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z" />
    </SvgIcon>
  );
}

export function TransitionComponent(props: TransitionProps) {
  const style = useSpring({
    from: { opacity: 0, transform: 'translate3d(20px,0,0)' },
    to: { opacity: props.in ? 1 : 0, transform: `translate3d(${props.in ? 0 : 20}px,0,0)` },
  });

  return (
    <animated.div style={style}>
      <Collapse {...props} />
    </animated.div>
  );
}

export function getSchemaPart(dataModelPath: string[], subSchema: any, mainSchema: any): any {
  const dataModelRoot = dataModelPath[0];
  if (subSchema.properties && subSchema.properties[dataModelRoot] && dataModelPath && dataModelPath.length !== 0) {
    const localRootElement = subSchema.properties[dataModelRoot];
    if (localRootElement.$ref) {
      const childSchemaPtr = JsonPointer.compile(localRootElement.$ref.substr(1));
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    if (localRootElement.items && localRootElement.items.$ref) {
      const childSchemaPtr = JsonPointer.compile(localRootElement.items.$ref.substr(1));
      return getSchemaPart(dataModelPath.slice(1), childSchemaPtr.get(mainSchema), mainSchema);
    }
    return localRootElement;
  }

  if (subSchema.allOf) {
    let tmpSchema: any = {};
    subSchema.allOf.forEach((element: any) => {
      tmpSchema = {
        ...tmpSchema,
        ...element,
      };
    });
    return getSchemaPart(dataModelPath, tmpSchema, mainSchema);
  }

  if (subSchema.$ref) {
    const ptr = JsonPointer.compile(subSchema.$ref.substr(1));
    return getSchemaPart(dataModelPath.slice(1), ptr.get(mainSchema), mainSchema);
  }

  return subSchema;
}