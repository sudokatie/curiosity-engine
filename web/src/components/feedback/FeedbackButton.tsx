/**
 * Feedback Button and Modal
 */

import { useState } from 'react';
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
        className="fixed bottom-4 right-4 w-12 h-12 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors z-40"
        title="Send Feedback"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
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
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h2 className="font-mono text-sm tracking-wider">SEND FEEDBACK</h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-white"
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {success ? (
                <div className="text-center py-8">
                  <div className="text-green-500 text-lg mb-2">Feedback sent!</div>
                  <p className="text-gray-500 text-sm">Thanks for helping improve Curiosity Engine.</p>
                </div>
              ) : (
                <>
                  {/* Type Selection */}
                  <div>
                    <label className="block text-xs text-gray-500 font-mono mb-2">TYPE</label>
                    <div className="flex gap-2">
                      {(['bug', 'feature', 'other'] as FeedbackType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={`flex-1 py-2 px-3 text-xs font-mono uppercase border ${
                            type === t
                              ? 'border-white text-white bg-white/10'
                              : 'border-gray-700 text-gray-500 hover:border-gray-600'
                          }`}
                        >
                          {t === 'bug' ? 'Bug' : t === 'feature' ? 'Feature' : 'Other'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs text-gray-500 font-mono mb-2">SUBJECT</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief description..."
                      maxLength={200}
                      required
                      className="w-full bg-black border border-gray-800 px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-gray-600 focus:outline-none"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs text-gray-500 font-mono mb-2">MESSAGE</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the issue or suggestion in detail..."
                      rows={5}
                      maxLength={5000}
                      required
                      className="w-full bg-black border border-gray-800 px-3 py-2 text-sm font-mono placeholder-gray-600 focus:border-gray-600 focus:outline-none resize-none"
                    />
                    <div className="text-right text-xs text-gray-600 mt-1">
                      {message.length} / 5000
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="text-red-500 text-xs font-mono p-2 border border-red-500/30 bg-red-500/10">
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !subject.trim() || !message.trim()}
                    className="w-full py-2 bg-white text-black font-mono text-sm tracking-wider hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'SENDING...' : 'SEND FEEDBACK'}
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
