'use client';

import { useState, useEffect } from 'react';
import { track } from '@vercel/analytics';

interface DropFeedbackProps {
  haulId: string;
  onSubmitted: () => void;
}

export default function DropFeedback({ haulId, onSubmitted }: DropFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [wouldWear, setWouldWear] = useState<'yes' | 'maybe' | 'no' | null>(null);
  const [textFeedback, setTextFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if feedback already submitted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const submitted = localStorage.getItem(`feedback_${haulId}`);
      if (submitted === 'true') {
        onSubmitted();
      }
    }
  }, [haulId, onSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0 || !wouldWear) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          wouldWear,
          textFeedback: textFeedback.trim() || undefined,
          haulId,
        }),
      });

      if (response.ok) {
        // Mark as submitted in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(`feedback_${haulId}`, 'true');
        }

        // Track feedback submission
        track('drop_feedback_submitted', {
          haulId,
          rating,
          wouldWear,
          hasTextFeedback: !!textFeedback.trim(),
        });

        setSubmitStatus('success');
        // Call onSubmitted after a brief delay
        setTimeout(() => {
          onSubmitted();
        }, 1500);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show expanded form after 5 seconds, or if user clicks
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExpanded(true);
    }, 5000); // Show after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!isExpanded) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-8">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div>
            <p className="text-sm font-medium uppercase tracking-wide mb-1">
              How was your drop?
            </p>
            <p className="text-xs text-neutral-500">
              Help us improve (optional)
            </p>
          </div>
          <svg 
            className="w-5 h-5 text-neutral-400 group-hover:text-neutral-900 transition-colors" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 md:p-8 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-medium mb-2 uppercase tracking-tight">
            How was your drop?
          </h2>
          <p className="text-sm text-neutral-600">
            Help us improve by sharing your thoughts (optional)
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-neutral-400 hover:text-neutral-900 transition-colors"
          type="button"
          aria-label="Minimize feedback"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium mb-3 uppercase tracking-wide">
            Rate this drop *
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-2xl md:text-3xl transition-colors focus:outline-none"
                aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              >
                {(hoverRating || rating) >= star ? (
                  <span className="text-yellow-400">★</span>
                ) : (
                  <span className="text-neutral-300">★</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Would Wear Question */}
        <div>
          <label className="block text-sm font-medium mb-3 uppercase tracking-wide">
            Would you actually wear any of these? *
          </label>
          <div className="flex flex-wrap gap-3">
            {(['yes', 'maybe', 'no'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setWouldWear(option)}
                className={`px-6 py-3 border-2 transition-all font-medium text-sm uppercase tracking-wide ${
                  wouldWear === option
                    ? 'border-black bg-black text-white'
                    : 'border-neutral-300 bg-white hover:border-black'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Text Feedback */}
        <div>
          <label htmlFor="textFeedback" className="block text-sm font-medium mb-3 uppercase tracking-wide">
            What felt off? (Optional)
          </label>
          <textarea
            id="textFeedback"
            value={textFeedback}
            onChange={(e) => setTextFeedback(e.target.value)}
            placeholder="Tell us what could be better..."
            rows={4}
            className="w-full px-4 py-3 border-2 border-neutral-300 focus:border-black focus:outline-none text-sm resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || !wouldWear}
            className="px-6 py-3 bg-black text-white hover:bg-neutral-800 transition-colors font-medium text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
          {submitStatus === 'success' && (
            <span className="flex items-center text-sm text-green-600">
              ✓ Thank you!
            </span>
          )}
          {submitStatus === 'error' && (
            <span className="flex items-center text-sm text-red-600">
              Something went wrong. Please try again.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
