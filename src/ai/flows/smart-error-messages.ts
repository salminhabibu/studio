'use server';

/**
 * @fileOverview Validates a video URL and provides feedback on supported video sites.
 *
 * - smartErrorMessages - A function that validates a video URL and provides feedback.
 * - SmartErrorMessagesInput - The input type for the smartErrorMessages function.
 * - SmartErrorMessagesOutput - The return type for the smartErrorMessages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartErrorMessagesInputSchema = z.object({
  url: z.string().describe('The URL of the video to validate.'),
});
export type SmartErrorMessagesInput = z.infer<typeof SmartErrorMessagesInputSchema>;

const SmartErrorMessagesOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the URL is valid and supported.'),
  feedback: z.string().describe('Feedback for the user, including supported site types if the URL is invalid.'),
});
export type SmartErrorMessagesOutput = z.infer<typeof SmartErrorMessagesOutputSchema>;

export async function smartErrorMessages(input: SmartErrorMessagesInput): Promise<SmartErrorMessagesOutput> {
  return smartErrorMessagesFlow(input);
}

const smartErrorMessagesPrompt = ai.definePrompt({
  name: 'smartErrorMessagesPrompt',
  input: {schema: SmartErrorMessagesInputSchema},
  output: {schema: SmartErrorMessagesOutputSchema},
  prompt: `You are a helpful assistant that validates video URLs.  You determine if the URL is a valid, working video URL, and if the site is supported.

  Currently supported video sites include YouTube, Vimeo, and Dailymotion.  If the URL is not working, or is not to a supported site, you should provide feedback to the user about the supported site types.

  URL: {{{url}}} `,
});

const smartErrorMessagesFlow = ai.defineFlow(
  {
    name: 'smartErrorMessagesFlow',
    inputSchema: SmartErrorMessagesInputSchema,
    outputSchema: SmartErrorMessagesOutputSchema,
  },
  async input => {
    const {output} = await smartErrorMessagesPrompt(input);
    return output!;
  }
);
