import type { Resolver } from "react-hook-form";
import type { ZodSchema } from "zod";

export function zodResolver<T>(schema: ZodSchema<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const formErrors: Record<string, any> = {};
    result.error.errors.forEach((error) => {
      const path = error.path.join(".");
      formErrors[path] = {
        type: error.code,
        message: error.message
      };
    });

    return {
      values: {},
      errors: formErrors
    };
  };
}
