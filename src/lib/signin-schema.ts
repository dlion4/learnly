import { z } from "zod";
import { normalizeKenyanPhone } from "../data/auth";

const emailCheck = z.string().trim().email();

export function isValidIdentifier(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return emailCheck.safeParse(trimmed).success;
  return normalizeKenyanPhone(trimmed) !== null;
}

export const passwordSignInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your Kenyan phone number or email address.")
    .refine(isValidIdentifier, "Enter a valid Kenyan phone (+2547XX / 07XX) or email address."),
  password: z
    .string()
    .min(8, "Enter your password (at least 8 characters)."),
  rememberMe: z.boolean(),
});

export const otpRequestSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your Kenyan phone number or email address.")
    .refine(isValidIdentifier, "Enter a valid Kenyan phone (+2547XX / 07XX) or email address."),
  rememberMe: z.boolean(),
});

export type PasswordSignInValues = z.infer<typeof passwordSignInSchema>;
export type OtpRequestValues = z.infer<typeof otpRequestSchema>;
