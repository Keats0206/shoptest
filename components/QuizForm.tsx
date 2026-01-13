'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';

export interface QuizAnswers {
  styleVibes: string[]; // Multi-select for Slide 1
  lifestyleContexts: string[]; // Multi-select for Slide 2
  bodyType?: string; // Optional for Slide 3
  fitPreference?: string; // Optional for Slide 3
  shoppingPainPoints: string[]; // Multi-select for Slide 3
  budget: string; // Required for Slide 4
  willingToSpendMoreOn: string[]; // Multi-select for Slide 4
}

// Slide 1: Visual Style Selector - 8-12 outfit images spanning different aesthetics
const STYLE_OPTIONS = [
  { value: "minimalist", label: "Minimalist", desc: "Clean lines, simple elegance" },
  { value: "streetwear", label: "Streetwear", desc: "Urban, casual cool" },
  { value: "boho", label: "Boho", desc: "Free-spirited, artistic" },
  { value: "preppy", label: "Preppy", desc: "Classic, polished" },
  { value: "edgy", label: "Edgy", desc: "Bold, statement-making" },
  { value: "classic", label: "Classic", desc: "Timeless, sophisticated" },
  { value: "romantic", label: "Romantic", desc: "Feminine, delicate" },
  { value: "athleisure", label: "Athleisure", desc: "Comfortable, active-ready" },
  { value: "tailored", label: "Tailored", desc: "Sharp, polished fits" },
  { value: "relaxed", label: "Relaxed", desc: "Comfortable, effortless" },
];

// Slide 2: Lifestyle Context
const LIFESTYLE_OPTIONS = [
  { value: "work-office", label: "Work (Office)", desc: "Professional office wear" },
  { value: "work-casual", label: "Work (Casual)", desc: "Casual workplace" },
  { value: "dates-going-out", label: "Dates/Going Out", desc: "Dressed up, special occasions" },
  { value: "everyday-casual", label: "Everyday Casual", desc: "Daily comfort" },
  { value: "athletic-active", label: "Athletic/Active", desc: "Workout & active lifestyle" },
  { value: "special-occasions", label: "Special Occasions", desc: "Events & celebrations" },
];

// Slide 3: Fit & Body Preferences
const BODY_TYPE_OPTIONS = [
  { value: "athletic", label: "Athletic" },
  { value: "curvy", label: "Curvy" },
  { value: "petite", label: "Petite" },
  { value: "tall", label: "Tall" },
  { value: "straight", label: "Straight" },
  { value: "plus", label: "Plus" },
];

const FIT_PREFERENCE_OPTIONS = [
  { value: "fitted", label: "Fitted" },
  { value: "relaxed", label: "Relaxed" },
  { value: "oversized", label: "Oversized" },
  { value: "tailored", label: "Tailored" },
];

const PAIN_POINT_OPTIONS = [
  { value: "nothing-fits-proportions", label: "Nothing fits my proportions" },
  { value: "colors-look-wrong", label: "Colors look wrong on me" },
  { value: "same-style-everywhere", label: "Same style everywhere" },
  { value: "too-expensive", label: "Too expensive" },
  { value: "overwhelmed-by-choice", label: "Overwhelmed by choice" },
];

// Slide 4: Budget & Priorities
const BUDGET_OPTIONS = [
  { value: "$", label: "Under $50", desc: "Budget-friendly" },
  { value: "$$", label: "$50-100", desc: "Mid-range" },
  { value: "$$$", label: "$100-200", desc: "Premium" },
  { value: "$$$$", label: "$200+", desc: "Luxury" },
  { value: "$$$$$", label: "Splurge-worthy", desc: "Don't care about price" },
];

const SPEND_MORE_OPTIONS = [
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
  { value: "bags", label: "Bags" },
  { value: "everything", label: "Everything" },
  { value: "nothing", label: "Nothing" },
];

const QUIZ_STORAGE_KEY = 'shoppal_quiz_progress';

export default function QuizForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(-1); // Start at -1 to show intro
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswers>({
    styleVibes: [],
    lifestyleContexts: [],
    shoppingPainPoints: [],
    budget: '',
    willingToSpendMoreOn: [],
  });

  // Load saved progress on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(QUIZ_STORAGE_KEY);
      if (saved) {
        try {
          const savedData = JSON.parse(saved);
          setAnswers(savedData.answers);
          setCurrentStep(savedData.currentStep);
        } catch (e) {
          console.error('Failed to load saved quiz progress:', e);
        }
      }
    }
  }, []);

  // Auto-save progress
  useEffect(() => {
    if (currentStep >= 0 && typeof window !== 'undefined') {
      const saveData = {
        answers,
        currentStep,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(saveData));
    }
  }, [answers, currentStep]);

  const steps = [
    {
      id: 'style',
      title: "Select your style vibes",
      subtitle: "Choose all that resonate with you",
    },
    {
      id: 'lifestyle',
      title: "What do you need outfits for?",
      subtitle: "Select all that apply",
    },
    {
      id: 'fit',
      title: "Fit & preferences",
      subtitle: "Help us understand your needs (all optional)",
    },
    {
      id: 'budget',
      title: "Budget & priorities",
      subtitle: "Tell us your price range",
    },
  ];

  const currentStepData = currentStep >= 0 ? steps[currentStep] : null;
  const progress = currentStep >= 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  const handleStartQuiz = () => {
    setCurrentStep(0);
  };

  const toggleMultiSelect = (arrayKey: keyof QuizAnswers, value: string) => {
    const currentArray = (answers[arrayKey] as string[]) || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    setAnswers({ ...answers, [arrayKey]: newArray });
  };

  const handleSingleSelect = (key: keyof QuizAnswers, value: string) => {
    setAnswers({ ...answers, [key]: value });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!answers.budget) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Clear saved progress
      if (typeof window !== 'undefined') {
        localStorage.removeItem(QUIZ_STORAGE_KEY);
      }

      // Map to new quiz format
      const quiz: {
        styles: string[];
        occasions: string[];
        bodyType: string;
        fitPreference?: string;
        budgetRange: string;
        avoidances: string[];
        mustHaves: string[];
        colorPreferences?: string;
        favoriteBrands?: string[];
      } = {
        styles: answers.styleVibes.length > 0 ? answers.styleVibes : ['classic'],
        occasions: answers.lifestyleContexts.length > 0 ? answers.lifestyleContexts : ['everyday-casual'],
        bodyType: answers.bodyType || 'average',
        fitPreference: answers.fitPreference,
        budgetRange: answers.budget,
        avoidances: answers.shoppingPainPoints.filter(p => p !== 'colors-look-wrong'),
        mustHaves: answers.willingToSpendMoreOn || [],
        colorPreferences: answers.shoppingPainPoints.includes('colors-look-wrong') ? 'neutral' : 'mixed',
        favoriteBrands: [], // Can be added later if quiz collects this
      };

      const payload = {
        quiz,
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
          products: data.products || [],
          outfits: data.outfits || [],
          versatilePieces: data.versatilePieces || [],
          quiz: data.quiz || quiz,
          createdAt: new Date().toISOString(),
        };
        sessionStorage.setItem(`haul_${haulId}`, JSON.stringify(haulData));
        localStorage.setItem(`haul_${haulId}`, JSON.stringify(haulData));
      }
      
      track('quiz_completion', {
        styleVibes: answers.styleVibes.join(','),
        lifestyleContexts: answers.lifestyleContexts.join(','),
        budget: answers.budget,
        hasBodyType: !!answers.bodyType,
        painPointsCount: answers.shoppingPainPoints.length,
      });
      
      router.push(`/haul?id=${haulId}`);
    } catch (error) {
      console.error('Error generating haul:', error);
      setIsSubmitting(false);
      alert(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    }
  };

  const canProceed = currentStep < 0
    ? false // Intro screen
    : currentStep === 0
    ? answers.styleVibes.length > 0 // At least one style selected
    : currentStep === 1
    ? answers.lifestyleContexts.length > 0 // At least one lifestyle context
    : currentStep === 2
    ? true // All optional on step 3
    : answers.budget !== ''; // Budget required on step 4

  const isLastStep = currentStep >= 0 && currentStep === steps.length - 1;

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
        {/* Intro Screen */}
        {currentStep === -1 && (
          <div className="text-center py-12">
            <h1 className="text-3xl font-medium mb-4 uppercase tracking-tight">
              Your stylist, instantly
            </h1>
            <p className="text-xl font-medium mb-2 uppercase tracking-wide text-neutral-600">
              Styled in 2 minutes, not 2 weeks
            </p>
            <div className="mt-8 mb-10 space-y-4 text-left">
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-black shrink-0">12</div>
                <div>
                  <div className="font-medium text-sm uppercase tracking-wide mb-1">Curated pieces</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">Handpicked for your style</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-black shrink-0">2</div>
                <div>
                  <div className="font-medium text-sm uppercase tracking-wide mb-1">Minutes</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">Quick style quiz</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartQuiz}
              className="w-full px-6 py-4 bg-black text-white hover:bg-neutral-900 transition-colors font-medium text-sm uppercase tracking-wide"
            >
              Start Style Quiz
            </button>
          </div>
        )}

        {/* Progress bar - only show when quiz has started */}
        {currentStep >= 0 && (
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
        )}

        {/* Step Content */}
        {currentStep >= 0 && currentStepData && (
          <div className="mb-8">
            <h1 className="text-2xl font-medium mb-1 uppercase tracking-tight">{currentStepData.title}</h1>
            <p className="text-xs text-neutral-500 mb-8 uppercase tracking-wide">{currentStepData.subtitle}</p>

            {/* Slide 1: Visual Style Selector */}
            {currentStep === 0 && (
              <div className="grid grid-cols-2 gap-3">
                {STYLE_OPTIONS.map((option) => {
                  const isSelected = answers.styleVibes.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleMultiSelect('styleVibes', option.value)}
                      className={`p-6 border-2 transition-all text-left relative ${
                        isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white hover:border-black'
                      }`}
                    >
                      {/* Placeholder for image - can be replaced with actual images */}
                      <div className={`w-full h-24 mb-3 ${
                        isSelected ? 'bg-neutral-800' : 'bg-neutral-100'
                      }`}></div>
                      <div className="font-medium text-sm uppercase tracking-wide mb-1">{option.label}</div>
                      <div className={`text-xs uppercase tracking-wide ${
                        isSelected ? 'text-neutral-300' : 'text-neutral-500'
                      }`}>
                        {option.desc}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Slide 2: Lifestyle Context */}
            {currentStep === 1 && (
              <div className="space-y-2">
                {LIFESTYLE_OPTIONS.map((option) => {
                  const isSelected = answers.lifestyleContexts.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleMultiSelect('lifestyleContexts', option.value)}
                      className={`w-full p-4 border-2 transition-all text-left flex items-center gap-3 ${
                        isSelected
                          ? 'border-black bg-black text-white'
                          : 'border-neutral-300 bg-white hover:border-black'
                      }`}
                    >
                      <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 ${
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
                    </button>
                  );
                })}
              </div>
            )}

            {/* Slide 3: Fit & Body Preferences */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Body Type - Optional */}
                <div>
                  <p className="text-xs text-neutral-500 mb-3 uppercase tracking-wide">Body Type (Optional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {BODY_TYPE_OPTIONS.map((option) => {
                      const isSelected = answers.bodyType === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSingleSelect('bodyType', option.value)}
                          className={`p-3 border-2 transition-all text-center ${
                            isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white hover:border-black'
                          }`}
                        >
                          <div className="text-xs font-medium uppercase tracking-wide">{option.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Fit Preference - Optional */}
                <div>
                  <p className="text-xs text-neutral-500 mb-3 uppercase tracking-wide">Fit Preference (Optional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FIT_PREFERENCE_OPTIONS.map((option) => {
                      const isSelected = answers.fitPreference === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSingleSelect('fitPreference', option.value)}
                          className={`p-3 border-2 transition-all text-center ${
                            isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white hover:border-black'
                          }`}
                        >
                          <div className="text-xs font-medium uppercase tracking-wide">{option.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shopping Pain Points - Multi-select */}
                <div>
                  <p className="text-xs text-neutral-500 mb-3 uppercase tracking-wide">What frustrates you about shopping? (Optional)</p>
                  <div className="space-y-2">
                    {PAIN_POINT_OPTIONS.map((option) => {
                      const isSelected = answers.shoppingPainPoints.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleMultiSelect('shoppingPainPoints', option.value)}
                          className={`w-full p-3 border-2 transition-all text-left flex items-center gap-3 ${
                            isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white hover:border-black'
                          }`}
                        >
                          <div className={`w-4 h-4 border-2 flex items-center justify-center shrink-0 ${
                            isSelected 
                              ? 'border-white bg-white' 
                              : 'border-neutral-400 bg-white'
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="text-xs font-medium uppercase tracking-wide">{option.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Slide 4: Budget & Priorities */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Budget - Required */}
                <div>
                  <p className="text-xs text-neutral-500 mb-3 uppercase tracking-wide">Budget per item *</p>
                  <div className="space-y-2">
                    {BUDGET_OPTIONS.map((option) => {
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
                            onChange={() => handleSingleSelect('budget', option.value)}
                            className="sr-only"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Willing to Spend More On - Optional */}
                <div>
                  <p className="text-xs text-neutral-500 mb-3 uppercase tracking-wide">Willing to spend more on (Optional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SPEND_MORE_OPTIONS.map((option) => {
                      const isSelected = answers.willingToSpendMoreOn.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleMultiSelect('willingToSpendMoreOn', option.value)}
                          className={`p-3 border-2 transition-all text-center ${
                            isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-300 bg-white hover:border-black'
                          }`}
                        >
                          <div className="text-xs font-medium uppercase tracking-wide">{option.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {currentStep >= 0 && (
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
                Next
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
        )}
      </div>
    </div>
  );
}
