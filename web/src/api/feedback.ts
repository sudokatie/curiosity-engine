/**
 * Feedback API
 */

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3333/api';

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
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(feedback),
  });

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit feedback');
  }

  return data;
}
