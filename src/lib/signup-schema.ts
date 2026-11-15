import { z } from "zod";
import { configuredBootstrapToken, type SignupRole, type SignupFormValues } from "../data/auth";

const base = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter the learner or account holder's full name.")
      .max(120, "Full name must be 120 characters or fewer.")
      .refine((value) => value.split(/\s+/).length >= 2, "Enter at least two names, e.g. Amani Wanjiku Kamau.")
      .refine((value) => /^[\p{L}\s'-]+$/u.test(value), "Use letters, spaces, apostrophes or hyphens for the name."),
    nationalId: z
      .string()
      .trim()
      .regex(/^(?:K\d{6}|\d{8}|\d{9,10})$/, "Enter an 8-digit National ID, a 9–10 digit birth certificate, or K followed by six certificate digits.")
      .transform((value) => value.toUpperCase()),
    phone: z
      .string()
      .trim()
      .regex(/^\+254[17]\d{8}$/, "Enter a Kenyan number without the leading 0, e.g. 712345678."),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")], { error: "Enter a valid email address." }),
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(128, "Password must be 128 characters or fewer.")
      .regex(/\d/, "Include at least one number.")
      .regex(/[^A-Za-z0-9\s]/, "Include at least one symbol, e.g. !, @ or #."),
    confirmPassword: z.string().min(1, "Re-enter your password."),
    terms: z.boolean().refine((value) => value, "Please accept the Terms of Service to continue."),
    dpa: z.boolean().refine((value) => value, "DPA 2019 consent is required to create your account."),
    bootstrapToken: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Both passwords must match." });
    }
  });

export function createSignupSchema(role: SignupRole) {
  return base.superRefine((data, ctx) => {
    if (role !== "admin") return;
    if (!data.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "A work email is required for admin / sponsor accounts." });
    }
    const expected = configuredBootstrapToken();
    const matchesConfigured = !!expected && data.bootstrapToken.trim() === expected;
    const matchesPublicDemo = data.bootstrapToken.trim() === "LEARNLY-DEMO-2025";
    if (!matchesConfigured && !matchesPublicDemo) {
      ctx.addIssue({
        code: "custom",
        path: ["bootstrapToken"],
        message: expected ? "The bootstrap token is invalid. Check the one-time token issued by your administrator." : "Enter the preview bootstrap token shown below, or configure VITE_LEARNLY_BOOTSTRAP_TOKEN.",
      });
    }
  });
}

export type SignupValues = z.infer<typeof base>;
export type { SignupFormValues };
