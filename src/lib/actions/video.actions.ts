// src/lib/actions/video.actions.ts
"use server";

import { validateVideoUrl, type ValidateVideoUrlInput, type ValidateVideoUrlOutput } from "@/ai/flows/video-url-validator";
import { z } from "zod";

const VideoUrlActionInputSchema = z.object({
  url: z.string().url(),
});

export async function handleVideoUrlValidation(
  input: z.infer<typeof VideoUrlActionInputSchema>
): Promise<ValidateVideoUrlOutput> {
  try {
    const validatedInput: ValidateVideoUrlInput = VideoUrlActionInputSchema.parse(input);
    const result = await validateVideoUrl(validatedInput);
    return result;
  } catch (error) {
    console.error("Error in handleVideoUrlValidation:", error);
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        feedback: `Invalid input: ${error.errors.map(e => e.message).join(', ')}`,
      };
    }
    return {
      isValid: false,
      feedback: "An unexpected error occurred during validation. Please ensure the URL is correct and try again.",
    };
  }
}
