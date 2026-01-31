import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { Button } from '@/components/button';
import { FormInputDuration } from '@/components/form/input-duration';
import { FormInputNumber } from '@/components/form/input-number';
import { FormInputPassword } from '@/components/form/input-password';
import { FormInputText } from '@/components/form/input-text';
import { FormSelect } from '@/components/form/select';
import { FormSwitch } from '@/components/form/switch';
import { FormInputTextArea } from '@/components/form/input-textarea';
import { FormInputRecord } from '@/components/form/input-record';
import { FormInputArray } from '@/components/form/input-array';
import type { ClientLogger } from '@/lib/logger/client';

// https://tanstack.com/form/latest/docs/framework/react/guides/form-composition

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

export const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    FormInputArray,
    FormInputDuration,
    FormInputNumber,
    FormInputPassword,
    FormInputRecord,
    FormInputText,
    FormInputTextArea,
    FormSelect,
    FormSwitch,
  },
  formComponents: {
    Button,
  },
});

/** accepts a zod disc union exported as a json schema, and a discriminator. returns the narrowed schema's field names in dot notation */
export function getJsonSchemaDiscUnionFields(openApiJsonSchema: { oneOf?: unknown }, kind: string): Set<string> {
  function recurse(fragment: Record<string, unknown>, path: string): undefined | string[] {
    const type =
      'type' in fragment ? fragment.type : 'oneOf' in fragment ? 'oneOf' : 'anyOf' in fragment ? 'anyOf' : null;
    if (type === null) return;
    if (type === 'anyOf') {
      if (!Array.isArray(fragment.anyOf)) return;
      return fragment.anyOf
        .flatMap((item) => recurse(item as Record<string, unknown>, path))
        .filter((item) => typeof item !== 'undefined');
    }
    if (type === 'oneOf') {
      if (!Array.isArray(fragment.oneOf)) return;
      return fragment.oneOf
        .flatMap((item) => recurse(item as Record<string, unknown>, path))
        .filter((item) => typeof item !== 'undefined');
    }
    if (type === 'object') {
      if (!('properties' in fragment)) return [path];
      return Object.entries(fragment.properties as Record<string, Record<string, unknown>>)
        .flatMap(([key, val]) => recurse(val, `${path}.${key}`))
        .filter((item) => typeof item !== 'undefined');
    }
    return [path];
  }
  const narrowed = (openApiJsonSchema.oneOf as unknown as { properties: { kind: { enum: string[] } } }[]).find((item) =>
    item.properties.kind.enum.includes(kind)
  );
  if (!narrowed) throw new Error(`could not narrow json schema to kind: ${kind}`);
  const set = new Set(recurse(narrowed as Record<string, unknown>, 'params'));
  return set;
}

/** wraps a zod schema to help with tanstack form's anger issues */
export function makeZodValidator(
  zodSchema: {
    safeParse: (data: unknown) =>
      | { success: true }
      | {
          success: false;
          error: { issues: { path: unknown[]; message: string }[] };
        };
  },
  logger: ClientLogger
) {
  return function ({ value }: { value: unknown }) {
    logger.debugLow('validating', value);
    const parsed = zodSchema.safeParse(value);
    if (parsed.success) return null;
    const fields: Record<string, string> = Object.fromEntries(
      parsed.error.issues
        .map((issue) => [issue.path.filter((item) => typeof item === 'string').join('.'), issue.message])
        .filter(([path]) => path.length)
    );
    logger.warn('validation error', fields);
    return { fields };
  };
}
