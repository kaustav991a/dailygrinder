'use server';

/**
 * @fileOverview AI-powered weekly summary report generation flow.
 *
 * - generateWeeklySummary - A function that generates a summary of the past week's activities.
 * - GenerateWeeklySummaryInput - The input type for the generateWeeklySummary function.
 * - GenerateWeeklySummaryOutput - The return type for the generateWeeklySummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeeklySummaryInputSchema = z.object({
  timeEntries: z
    .string()
    .describe(
      'A formatted string of time entries from the past week, including project name, description, and duration.'
    ),
});
export type GenerateWeeklySummaryInput = z.infer<typeof GenerateWeeklySummaryInputSchema>;

const GenerateWeeklySummaryOutputSchema = z.object({
  totalHours: z.number().describe('The total number of hours logged in the week.'),
  projectBreakdown: z.array(z.object({
    projectName: z.string(),
    hours: z.number(),
  })).describe('A breakdown of hours spent per project.'),
  summary: z
    .string()
    .describe('A concise, insightful summary of the week\'s productivity and work patterns.'),
  highlights: z.array(z.string()).describe('A list of key achievements or notable activities.'),
});
export type GenerateWeeklySummaryOutput = z.infer<typeof GenerateWeeklySummaryOutputSchema>;

export async function generateWeeklySummary(
  input: GenerateWeeklySummaryInput
): Promise<GenerateWeeklySummaryOutput> {
  return generateWeeklySummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWeeklySummaryPrompt',
  input: {schema: GenerateWeeklySummaryInputSchema},
  output: {schema: GenerateWeeklySummaryOutputSchema},
  prompt: `You are a productivity coach analyzing a user's weekly time tracking data. Your goal is to provide a clear, encouraging, and insightful summary of their work habits.

Here are the time entries for the past week:
{{{timeEntries}}}

Analyze these entries and generate a report.
- Calculate the total hours logged.
- Create a breakdown of hours spent on each project.
- Write a short, insightful summary (2-3 sentences) of the user's week. Mention their most focused project and any noticeable patterns (e.g., consistent work, focus on a particular type of task).
- List 2-3 key highlights or accomplishments from the week based on their task descriptions.

Your tone should be positive and motivational.`,
});

const generateWeeklySummaryFlow = ai.defineFlow(
  {
    name: 'generateWeeklySummaryFlow',
    inputSchema: GenerateWeeklySummaryInputSchema,
    outputSchema: GenerateWeeklySummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
