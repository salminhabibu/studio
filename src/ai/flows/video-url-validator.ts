'use server';

/**
 * @fileOverview Validates a video URL and provides feedback on supported video sites.
 *
 * - validateVideoUrl - A function that validates a video URL and provides feedback.
 * - ValidateVideoUrlInput - The input type for the validateVideoUrl function.
 * - ValidateVideoUrlOutput - The return type for the validateVideoUrl function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateVideoUrlInputSchema = z.object({
  url: z.string().describe('The URL of the video to validate.'),
});
export type ValidateVideoUrlInput = z.infer<typeof ValidateVideoUrlInputSchema>;

const ValidateVideoUrlOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the URL is valid and supported.'),
  feedback: z.string().describe('Feedback for the user, including supported site types if the URL is invalid.'),
});
export type ValidateVideoUrlOutput = z.infer<typeof ValidateVideoUrlOutputSchema>;

export async function validateVideoUrl(input: ValidateVideoUrlInput): Promise<ValidateVideoUrlOutput> {
  return validateVideoUrlFlow(input);
}

const validateVideoUrlPrompt = ai.definePrompt({
  name: 'validateVideoUrlPrompt',
  input: {schema: ValidateVideoUrlInputSchema},
  output: {schema: ValidateVideoUrlOutputSchema},
  prompt: `You are a helpful assistant that validates video URLs.  You determine if the URL is a valid, working video URL, and if the site is supported.

  Currently supported video sites include YouTube, Vimeo, and Dailymotion.  If the URL is not working, or is not to a supported site, you should provide feedback to the user about the supported site types.

  URL: {{{url}}} `,
});

const validateVideoUrlFlow = ai.defineFlow(
  {
    name: 'validateVideoUrlFlow',
    inputSchema: ValidateVideoUrlInputSchema,
    outputSchema: ValidateVideoUrlOutputSchema,
  },
  async input => {
    const {output} = await validateVideoUrlPrompt(input);
    return output!;
  }
);
