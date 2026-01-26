/**
 * Feedback/Bug Report Routes
 */

import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { requireAuth } from '../middleware/auth.js';
import { getUserById } from '../db.js';

export const feedbackRouter = Router();

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FEEDBACK_EMAIL = 'jordan.halvorsen@gmail.com';

interface FeedbackBody {
  type: 'bug' | 'feature' | 'other';
  subject: string;
  message: string;
}

// Submit feedback (requires auth)
feedbackRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type, subject, message } = req.body as FeedbackBody;

    // Validation
    if (!type || !subject || !message) {
      return res.status(400).json({ error: 'Type, subject, and message are required' });
    }

    if (!['bug', 'feature', 'other'].includes(type)) {
      return res.status(400).json({ error: 'Type must be bug, feature, or other' });
    }

    if (subject.length > 200) {
      return res.status(400).json({ error: 'Subject too long (max 200 chars)' });
    }

    if (message.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 chars)' });
    }

    // Get user info
    const user = getUserById(req.userId!);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Format email
    const typeLabels = {
      bug: 'Bug Report',
      feature: 'Feature Request',
      other: 'General Feedback',
    };

    const emailSubject = `[Curiosity Engine] ${typeLabels[type]}: ${subject}`;
    const emailBody = `
Feedback Type: ${typeLabels[type]}
From: ${user.email} (User ID: ${user.id})
Date: ${new Date().toISOString()}

Subject: ${subject}

Message:
${message}

---
This feedback was submitted through the Curiosity Engine app.
    `.trim();

    // Send email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: FEEDBACK_EMAIL,
        replyTo: user.email,
        subject: emailSubject,
        text: emailBody,
      });
      console.log(`[Feedback] Email sent from ${user.email}: ${type} - ${subject}`);
    } else {
      // Log to console if email not configured
      console.log(`[Feedback] (email not configured) From ${user.email}:`);
      console.log(emailBody);
    }

    res.json({ 
      message: 'Feedback submitted successfully',
      note: process.env.SMTP_USER ? 'Email sent' : 'Logged (email not configured)',
    });
  } catch (error: any) {
    console.error('[Feedback] Error:', error.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});
