"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { zodResolver } from "@/lib/zod-resolver";

const schema = z.object({
  code: z.string().min(6, "Kode OTP harus 6 digit").max(6, "Kode OTP harus 6 digit")
});

type OtpFormProps = {
  email: string;
  onSuccess: () => void;
};

type FormValues = z.infer<typeof schema>;

export function OtpForm({ email, onSuccess }: OtpFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: "" }
  });

  const handleSubmit = (values: FormValues) => {
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code: values.code })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.error ?? "Gagal verifikasi OTP");
          return;
        }

        const signInResult = await signIn("credentials", {
          email,
          password: "__otp_flow__",
          otpBypass: "true",
          redirect: false
        });

        if (signInResult?.error) {
          setError(signInResult.error);
          return;
        }

        onSuccess();
      } catch (err) {
        console.error(err);
        setError("Terjadi kesalahan tidak terduga");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Verifikasi gagal</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Form form={form} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kode OTP</FormLabel>
              <FormControl>
                <Input {...field} maxLength={6} inputMode="numeric" placeholder="******" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Memverifikasi..." : "Verifikasi"}
        </Button>
      </Form>
    </div>
  );
}
