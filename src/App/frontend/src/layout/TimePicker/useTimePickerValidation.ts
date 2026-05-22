import { parseTimeString } from 'src/app-components/TimePicker/utils/timeConstraintUtils';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { type ComponentValidation, FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { readDataFromState } from 'src/features/validation/nodeValidation/readDataFromState';
import type { TimeFormat, TimeValue } from 'src/app-components/TimePicker/types';
import type { ComponentValidationContext } from 'src/layout';
import type { IDataModelBindings } from 'src/layout/layout';

const isValidTimeString = (timeStr: string, format: TimeFormat): boolean => {
  if (!timeStr) {
    return false;
  }

  const is12Hour = format.includes('a');
  const includesSeconds = format.includes('ss');

  const cleanTime = timeStr.trim();
  const timeRegex = is12Hour
    ? includesSeconds
      ? /^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i
      : /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    : includesSeconds
      ? /^(\d{1,2}):(\d{2}):(\d{2})$/
      : /^(\d{1,2}):(\d{2})$/;

  const match = cleanTime.match(timeRegex);
  if (!match) {
    return false;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = includesSeconds ? parseInt(match[3], 10) : 0;

  if (is12Hour) {
    if (hours < 1 || hours > 12) {
      return false;
    }
  } else {
    if (hours < 0 || hours > 23) {
      return false;
    }
  }

  if (minutes < 0 || minutes > 59) {
    return false;
  }
  if (seconds < 0 || seconds > 59) {
    return false;
  }

  return true;
};

const timeToSeconds = (time: TimeValue): number => time.hours * 3600 + time.minutes * 60 + time.seconds;

export function validateTimePicker(ctx: ComponentValidationContext<'TimePicker'>): ComponentValidation[] {
  const bindings = ctx.component.dataModelBindings as IDataModelBindings<'TimePicker'> | undefined;
  const data = readDataFromState(ctx.formState, bindings?.simpleBinding);
  const minTime = evalExpr(ctx.component.minTime, ctx.expressionDataSources, {
    returnType: ExprVal.String,
    defaultValue: '',
  });
  const maxTime = evalExpr(ctx.component.maxTime, ctx.expressionDataSources, {
    returnType: ExprVal.String,
    defaultValue: '',
  });
  const format = evalExpr(ctx.component.format, ctx.expressionDataSources, {
    returnType: ExprVal.String,
    defaultValue: 'HH:mm',
  }) as TimeFormat;

  const timeString = typeof data === 'string' || typeof data === 'number' ? String(data) : undefined;
  if (!timeString) {
    return [];
  }

  const validations: ComponentValidation[] = [];

  if (!isValidTimeString(timeString, format)) {
    validations.push({
      message: { key: 'time_picker.invalid_time_message', params: [format] },
      severity: 'error',
      source: FrontendValidationSource.Component,
      category: ValidationMask.Component,
    });
    return validations;
  }

  const parsedTime = parseTimeString(timeString, format);

  if (minTime && isValidTimeString(minTime, format)) {
    const minParsed = parseTimeString(minTime, format);
    if (timeToSeconds(parsedTime) < timeToSeconds(minParsed)) {
      validations.push({
        message: { key: 'time_picker.min_time_exceeded', params: [minTime] },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }
  }

  if (maxTime && isValidTimeString(maxTime, format)) {
    const maxParsed = parseTimeString(maxTime, format);
    if (timeToSeconds(parsedTime) > timeToSeconds(maxParsed)) {
      validations.push({
        message: { key: 'time_picker.max_time_exceeded', params: [maxTime] },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Component,
      });
    }
  }

  return validations;
}
