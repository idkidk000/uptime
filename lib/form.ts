import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { Button } from '@/components/button';
import { FormInputArray } from '@/components/form/input-array';
import { FormInputDuration } from '@/components/form/input-duration';
import { FormInputNumber } from '@/components/form/input-number';
import { FormInputPassword } from '@/components/form/input-password';
import { FormInputRecord } from '@/components/form/input-record';
import { FormInputText } from '@/components/form/input-text';
import { FormInputTextArea } from '@/components/form/input-textarea';
import { FormSelect } from '@/components/form/select';
import { FormSwitch } from '@/components/form/switch';
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

type DottedFieldPath = string & {};
export type FieldsMeta = Map<DottedFieldPath, { description: string | undefined; required: boolean }>;

/**
 * @param openApiJsonSchema Zod discriminated union exported to JSON schema in OpenAPI 3 format
 * @param kind the discriminator
 * @returns `Map<field name in dot notation, { description: string | undefined, required: boolean }>` for the narrowed schema
 */
export function getJsonSchemaFields(openApiJsonSchema: Record<string, unknown>, rootPath?: string): FieldsMeta {
  function recurse(
    fragment: Record<string, unknown>,
    path?: string,
    description?: string | undefined,
    required?: boolean | undefined
  ): undefined | { path: string; description: string | undefined; required: boolean }[] {
    const type =
      'type' in fragment ? fragment.type : 'oneOf' in fragment ? 'oneOf' : 'anyOf' in fragment ? 'anyOf' : null;
    description ??= 'description' in fragment ? (fragment.description as string) : undefined;
    // logger.debugMed({path,type,description,required})
    if (type === null) return;
    if (type === 'anyOf') {
      if (!Array.isArray(fragment.anyOf)) return;
      return fragment.anyOf
        .flatMap((item) => recurse(item as Record<string, unknown>, path, description, required))
        .filter((item) => typeof item !== 'undefined');
    }
    if (type === 'oneOf') {
      if (!Array.isArray(fragment.oneOf)) return;
      return fragment.oneOf
        .flatMap((item) => recurse(item as Record<string, unknown>, path, description, required))
        .filter((item) => typeof item !== 'undefined');
    }
    if (type === 'object') {
      if (!('properties' in fragment)) {
        if (!path) throw new Error('found record at root level');
        return [{ path, description, required: required ?? false }];
      }
      const reqFields = 'required' in fragment ? (fragment.required as string[]) : undefined;
      return Object.entries(fragment.properties as Record<string, Record<string, unknown>>)
        .flatMap(([key, val]) =>
          recurse(val, path ? `${path}.${key}` : key, description, reqFields?.includes(key) ?? required)
        )
        .filter((item) => typeof item !== 'undefined');
    }
    if (!path) throw new Error('root element is not an object');
    return [{ path, description, required: required ?? false }];
  }
  return new Map(recurse(openApiJsonSchema, rootPath)?.map(({ path, ...rest }) => [path, rest]));
}

/**
 * @param openApiJsonSchema Zod discriminated union exported to JSON schema in OpenAPI 3 format
 * @param kind the discriminator
 * @returns `Map<field name in dot notation, { description: string | undefined, required: boolean }>` for the narrowed schema
 */
export function getJsonSchemaDiscUnionFields(openApiJsonSchema: { oneOf?: unknown }, kind: string): FieldsMeta {
  const narrowed = (openApiJsonSchema.oneOf as unknown as { properties: { kind: { enum: string[] } } }[]).find((item) =>
    item.properties.kind.enum.includes(kind)
  );
  if (!narrowed) throw new Error(`could not narrow json schema to kind: ${kind}`);
  return getJsonSchemaFields(narrowed, 'params');
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
