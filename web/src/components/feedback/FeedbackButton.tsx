/**
 * Feedback Button and Modal - Dispatch-inspired design
 */

import { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { submitFeedback } from '../../api/feedback';

type FeedbackType = 'bug' | 'feature' | 'other';

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitFeedback({ type, subject, message });
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setSubject('');
        setMessage('');
        setType('bug');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false);
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 w-10 h-10 bg-panel hover:bg-panel-strong border border-border hover:border-text-cream flex items-center justify-center text-muted hover:text-text-cream transition-all z-40"
        title="Send Feedback"
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-panel border border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-xs font-medium text-muted-olive uppercase tracking-wider">
                Send Feedback
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 text-muted hover:text-accent transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {success ? (
                <div className="text-center py-8">
                  <div className="font-serif text-xl text-ok mb-2">Feedback sent!</div>
                  <p className="text-muted text-sm">Thanks for helping improve Curiosity Engine.</p>
                </div>
              ) : (
                <>
                  {/* Type Selection */}
                  <div>
                    <label className="block text-xs text-muted-olive uppercase tracking-wider mb-2">
                      Type
                    </label>
                    <div className="flex gap-2">
                      {(['bug', 'feature', 'other'] as FeedbackType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={`flex-1 py-2 px-3 text-xs uppercase tracking-wider border transition-colors ${
                            type === t
                              ? 'border-text-cream text-text-cream bg-text-cream/10'
                              : 'border-border text-muted hover:border-border-strong hover:text-text'
                          }`}
                        >
                          {t === 'bug' ? 'Bug' : t === 'feature' ? 'Feature' : 'Other'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs text-muted-olive uppercase tracking-wider mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description..."
                      maxLength={200}
                      required
                      className="w-full bg-bg border border-border px-3 py-2.5 text-text placeholder-muted-olive focus:border-text-cream focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs text-muted-olive uppercase tracking-wider mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the issue or suggestion in detail..."
                      rows={5}
                      maxLength={5000}
                      required
                      className="w-full bg-bg border border-border px-3 py-2.5 text-text placeholder-muted-olive focus:border-text-cream focus:outline-none resize-none transition-colors"
                    />
                    <div className="text-right text-xs text-muted-olive font-mono mt-1">
                      {message.length} / 5000
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="text-danger text-sm p-3 border border-danger/30 bg-danger/10">
                      {error}
                    </div>
                  )}

                  <div className="dotted-separator" />

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !subject.trim() || !message.trim()}
                    className="w-full py-3 bg-text-cream text-bg text-sm uppercase tracking-wider font-medium hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-md"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
