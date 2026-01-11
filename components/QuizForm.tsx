'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface QuizAnswers {
  styleVibe: string;
  goToStyle: string; // Maps to shoppingFor
  userProblem?: string; // Optional "what's not working"
  budget: string;
  // Keep these for API compatibility, will default if not provided
  bodyType?: string;
  colorPreferences?: string;
  favoriteBrands?: string[];
}

// Visual vibe options - 6 styled outfit options
const VIBE_OPTIONS = [
  { value: "minimalist", label: "Minimalist", desc: "Clean lines, simple elegance" },
  { value: "classic", label: "Classic", desc: "Timeless, sophisticated pieces" },
  { value: "modern", label: "Modern", desc: "Contemporary edge" },
  { value: "tailored", label: "Tailored", desc: "Sharp, polished fits" },
  { value: "relaxed", label: "Relaxed", desc: "Comfortable, effortless style" },
  { value: "bohemian", label: "Bohemian", desc: "Free-spirited, artistic" },
];

// Go-to style options - 4 current state styles
const GO_TO_STYLES = [
  { value: "everyday", label: "Jeans & Tee", desc: "Casual everyday" },
  { value: "evening", label: "Dress", desc: "Dressed up" },
  { value: "weekend", label: "Athleisure", desc: "Active comfort" },
  { value: "work", label: "Blazer & Slacks", desc: "Professional" },
];

const BUDGETS = [
  { value: "$", label: "$", desc: "Budget-friendly" },
  { value: "$$", label: "$$", desc: "Mid-range" },
  { value: "$$$", label: "$$$", desc: "Premium" },
  { value: "$$$$", label: "$$$$", desc: "Luxury" },
];

export default function QuizForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswers>({
    styleVibe: '',
    goToStyle: '',
    userProblem: '',
    budget: '',
  });

  const steps = [
    {
      id: 'vibe',
      title: "Tap the vibe you're going for",
      subtitle: "Which style speaks to you?",
    },
    {
      id: 'goTo',
      title: "What's your go-to?",
      subtitle: "Your current everyday style",
    },
    {
      id: 'problem',
      title: "What's not working with your current wardrobe?",
      subtitle: "Tell us what's frustrating you (optional)",
    },
    {
      id: 'budget',
      title: "Price Range",
      subtitle: "Select your preference",
    },
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleVibeSelect = (value: string) => {
    setAnswers({ ...answers, styleVibe: value });
    setTimeout(() => setCurrentStep(currentStep + 1), 300);
  };

  const handleGoToSelect = (value: string) => {
    setAnswers({ ...answers, goToStyle: value });
    setTimeout(() => setCurrentStep(currentStep + 1), 300);
  };

  const handleProblemChange = (value: string) => {
    setAnswers({ ...answers, userProblem: value });
  };

  const handleBudgetSelect = (value: string) => {
    setAnswers({ ...answers, budget: value });
  };

  const handleNext = () => {
    if (currentStep === 2 && !answers.userProblem) {
      // Allow skip on problem step
      setCurrentStep(currentStep + 1);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!answers.styleVibe || !answers.goToStyle || !answers.budget) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Map to API format
      const payload = {
        styleVibe: answers.styleVibe,
        shoppingFor: answers.goToStyle, // Map goToStyle to shoppingFor
        budget: answers.budget,
        bodyType: 'average', // Default for Hybrid Lite
        colorPreferences: 'mixed', // Default for Hybrid Lite
        gender: "women's",
        favoriteBrands: '',
        userProblem: answers.userProblem || '', // Include user problem if provided
      };

      const response = await fetch('/api/generate-haul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate haul');
      }

      const data = await response.json();
      const haulId = data.haulId || `haul_${Date.now()}`;
      
      if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('No products were generated. Please try again or check your API configuration.');
      }
      
      if (typeof window !== 'undefined') {
        const haulData = {
          products: data.products,
          queries: data.queries || [],
          createdAt: new Date().toISOString(),
          profile: payload, // Store original profile for refinements
        };
        // Save to both sessionStorage (for immediate access) and localStorage (for persistence)
        sessionStorage.setItem(`haul_${haulId}`, JSON.stringify(haulData));
        localStorage.setItem(`haul_${haulId}`, JSON.stringify(haulData));
      }
      
      router.push(`/haul?id=${haulId}`);
    } catch (error) {
      console.error('Error generating haul:', error);
      setIsSubmitting(false);
      alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    }
  };

  const canProceed = currentStep === 0
    ? answers.styleVibe !== ''
    : currentStep === 1
    ? answers.goToStyle !== ''
    : currentStep === 2
    ? true // Problem step is optional
    : answers.budget !== '';

  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-white px-4 py-8 relative">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-neutral-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-black rounded-full border-t-transparent animate-spin"></div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium uppercase tracking-wide">Creating your drop</p>
              <div className="flex justify-center gap-1">
                <span className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-md mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1 bg-neutral-200 overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2 text-center uppercase tracking-wide">
            {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium mb-1 uppercase tracking-tight">{currentStepData.title}</h1>
          <p className="text-xs text-neutral-500 mb-8 uppercase tracking-wide">{currentStepData.subtitle}</p>

          {/* Step 1: Vibe Selection */}
          {currentStep === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {VIBE_OPTIONS.map((option) => {
                const isSelected = answers.styleVibe === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleVibeSelect(option.value)}
                    className={`p-6 border-2 transition-all text-left ${
                      isSelected
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white hover:border-black'
                    }`}
                  >
                    <div className="font-medium text-sm uppercase tracking-wide mb-1">{option.label}</div>
                    <div className={`text-xs uppercase tracking-wide ${
                      isSelected ? 'text-neutral-300' : 'text-neutral-500'
                    }`}>
                      {option.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Go-To Style Selection */}
          {currentStep === 1 && (
            <div className="grid grid-cols-2 gap-4">
              {GO_TO_STYLES.map((option) => {
                const isSelected = answers.goToStyle === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleGoToSelect(option.value)}
                    className={`p-8 border-2 transition-all text-center ${
                      isSelected
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white hover:border-black'
                    }`}
                  >
                    <div className="font-medium text-base uppercase tracking-wide mb-2">{option.label}</div>
                    <div className={`text-xs uppercase tracking-wide ${
                      isSelected ? 'text-neutral-300' : 'text-neutral-500'
                    }`}>
                      {option.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: Problem Input */}
          {currentStep === 2 && (
            <div>
              <textarea
                value={answers.userProblem || ''}
                onChange={(e) => handleProblemChange(e.target.value)}
                placeholder={`I'm 5'2" and everything is too long...`}
                className="w-full min-h-[200px] p-4 border-2 border-neutral-300 focus:border-black focus:outline-none resize-none text-sm"
              />
              <p className="text-xs text-neutral-500 mt-4 uppercase tracking-wide">
                Optional - Skip if you'd prefer not to share
              </p>
            </div>
          )}

          {/* Step 4: Budget Selection */}
          {currentStep === 3 && (
            <div className="space-y-2">
              {BUDGETS.map((option) => {
                const isSelected = answers.budget === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-300 bg-white hover:border-black'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? 'border-white bg-white' 
                        : 'border-neutral-400 bg-white'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm uppercase tracking-wide">{option.label}</div>
                      <div className={`text-xs mt-1 uppercase tracking-wide ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {option.desc}
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="budget"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => handleBudgetSelect(option.value)}
                      className="sr-only"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Back
            </button>
          )}
          {!isLastStep && canProceed && (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 px-6 py-3 bg-black text-white hover:bg-neutral-900 transition-colors font-medium text-sm uppercase tracking-wide"
            >
              {currentStep === 2 && !answers.userProblem ? 'Skip' : 'Next'}
            </button>
          )}
          {isLastStep && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed || isSubmitting}
              className="flex-1 px-6 py-3 bg-black text-white hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm uppercase tracking-wide"
            >
              {isSubmitting ? 'Creating your drop...' : 'Generate my haul'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
