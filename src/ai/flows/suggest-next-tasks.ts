'use server';

/**
 * @fileOverview AI-powered task suggestion flow.
 *
 * - suggestNextTasks - A function that suggests next actions or tasks based on project descriptions and previous time entries.
 * - SuggestNextTasksInput - The input type for the suggestNextTasks function.
 * - SuggestNextTasksOutput - The return type for the suggestNextTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextTasksInputSchema = z.object({
  projectDescription: z
    .string()
    .describe('The description of the project.'),
  previousTimeEntries: z
    .string()
    .describe(
      'A list of previous time entries for the project, including start and end times and dates.'
    ),
});
export type SuggestNextTasksInput = z.infer<typeof SuggestNextTasksInputSchema>;

const SuggestNextTasksOutputSchema = z.object({
  suggestedTasks: z
    .array(z.string())
    .describe('A list of suggested next actions or tasks.'),
  reasoning:
    z.string()
    .describe('The AI reasoning behind the suggested tasks.'),
});
export type SuggestNextTasksOutput = z.infer<typeof SuggestNextTasksOutputSchema>;

export async function suggestNextTasks(
  input: SuggestNextTasksInput
): Promise<SuggestNextTasksOutput> {
  return suggestNextTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNextTasksPrompt',
  input: {schema: SuggestNextTasksInputSchema},
  output: {schema: SuggestNextTasksOutputSchema},
  prompt: `You are a personal productivity assistant. Given a project description and a list of previous time entries, you will suggest the next actions or tasks the user should take.\n\nProject Description: {{{projectDescription}}}\n\nPrevious Time Entries: {{{previousTimeEntries}}}\n\nConsider the project description and previous time entries to provide specific and actionable suggestions.\n\nFormat your response as a list of tasks, followed by a brief explanation of your reasoning.\n\nExample:\nTasks:\n- Task 1: Research competitor products\n- Task 2: Create wireframes for new feature\n\nReasoning: Based on the project description and previous time entries, these tasks will help move the project forward.`, 
});

const suggestNextTasksFlow = ai.defineFlow(
  {
    name: 'suggestNextTasksFlow',
    inputSchema: SuggestNextTasksInputSchema,
    outputSchema: SuggestNextTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

