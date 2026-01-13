'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';
import QuizForm from '@/components/QuizForm';

export default function QuizPage() {
  useEffect(() => {
    track('quiz_start');
  }, []);

  return (
    <div>
      <QuizForm />
    </div>
  );
}
