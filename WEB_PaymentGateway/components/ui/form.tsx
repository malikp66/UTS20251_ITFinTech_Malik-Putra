"use client";

import * as React from "react";
import { FormProvider, type FieldValues, type FieldPath, Controller, type ControllerProps, type UseFormReturn } from "react-hook-form";

import { cn } from "@/lib/utils";

type FormProps<TFieldValues extends FieldValues = FieldValues> = {
  form: UseFormReturn<TFieldValues>;
  children: React.ReactNode;
} & React.FormHTMLAttributes<HTMLFormElement>;

export function Form<TFieldValues extends FieldValues>({ form, children, className, ...props }: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form className={className} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

type FormFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  render: (props: {
    field: ControllerProps<TFieldValues, TName>["field"];
  }) => React.ReactElement;
};

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({ render, ...props }: FormFieldProps<TFieldValues, TName>) {
  return <Controller {...props} render={(args) => render({ field: args.field })} />;
}

type FormItemProps = React.HTMLAttributes<HTMLDivElement>;

export function FormItem({ className, ...props }: FormItemProps) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

type FormLabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function FormLabel({ className, ...props }: FormLabelProps) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

type FormMessageProps = React.HTMLAttributes<HTMLParagraphElement>;

export function FormMessage({ className, ...props }: FormMessageProps) {
  if (!props.children) {
    return null;
  }
  return <p className={cn("text-sm text-destructive", className)} {...props} />;
}

export function FormControl({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!props.children) {
    return null;
  }
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
