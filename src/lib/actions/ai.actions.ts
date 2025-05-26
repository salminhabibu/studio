// src/lib/actions/ai.actions.ts
'use server';
import { smartErrorMessages as smartErrorMessagesFlow, SmartErrorMessagesInput, SmartErrorMessagesOutput } from '@/ai/flows/smart-error-messages';

export async function getSmartFeedback(input: SmartErrorMessagesInput): Promise<SmartErrorMessagesOutput> {
  // Ensure the flow is actually called and its result is returned.
  // Add try-catch for robustness if needed, though the flow itself might handle errors.
  try {
    const result = await smartErrorMessagesFlow(input);
    return result;
  } catch (error) {
    console.error("Error calling smartErrorMessagesFlow:", error);
    // Return a generic error structure that matches SmartErrorMessagesOutput
    return {
      isValid: false, // Assuming failure means it's not valid or processable
      feedback: "An unexpected error occurred while trying to get smart feedback. Please try again."
    };
  }
}
