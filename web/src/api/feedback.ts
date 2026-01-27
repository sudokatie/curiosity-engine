/**
 * Feedback API
 */

import { api } from './client';

export interface FeedbackSubmission {
  type: 'bug' | 'feature' | 'other';
  subject: string;
  message: string;
}

export interface FeedbackResponse {
  message: string;
  note?: string;
}

export async function submitFeedback(feedback: FeedbackSubmission): Promise<FeedbackResponse> {
  return api.post<FeedbackResponse>('/api/feedback', feedback);
}
