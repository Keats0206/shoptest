import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-32">
        <div className="text-center mb-20">
          <h1 className="text-7xl md:text-8xl font-serif font-bold mb-8 tracking-tight">
            ShopPal
          </h1>
          
          {/* Primary Value Prop - Specific Pain Point */}
          <h2 className="text-3xl md:text-5xl font-medium mb-6 text-neutral-900 max-w-3xl mx-auto leading-tight">
            Why can't I find pieces that actually work together?
          </h2>
          
          <p className="text-xl md:text-2xl text-neutral-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Get a personalized drop of 12 pieces that fit your style, budget, and body—in 2 minutes.
          </p>

          {/* De-risking CTA */}
          <div className="mb-16">
            <Link
              href="/quiz"
              className="inline-block px-10 py-5 bg-black text-white hover:bg-neutral-900 transition-colors font-medium text-lg uppercase tracking-wide"
            >
              Get my free drop
            </Link>
            <p className="text-base text-neutral-500 mt-4">
              Free • No subscription • Takes 2 minutes
            </p>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8 text-sm md:text-base text-neutral-500 mb-16">
            <span>No subscription required</span>
            <span>•</span>
            <span>Budget-friendly options</span>
            <span>•</span>
            <span>Save 20+ shopping hours</span>
          </div>
        </div>

        {/* Hero Image Placeholder */}
        <div className="relative w-full aspect-[16/10] bg-neutral-100 rounded-lg overflow-hidden mb-20 max-w-5xl mx-auto">
          <Image
            src="/placeholder-hero.jpg"
            alt="Personalized style drop"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1280px"
            priority
          />
        </div>

        {/* Value Props Grid */}
        <div className="grid md:grid-cols-3 gap-12 md:gap-16 max-w-5xl mx-auto mb-24">
          {/* Value Prop 1: Specific Solution */}
          <div className="text-center">
            <div className="relative w-full aspect-[4/5] bg-neutral-100 rounded-lg overflow-hidden mb-6">
              <Image
                src="/placeholder-curated.jpg"
                alt="Curated pieces"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-medium mb-3 uppercase tracking-wide text-base">Curated for You</h3>
            <p className="text-base text-neutral-600 leading-relaxed">
              Pieces chosen for your body type, aesthetic, and price range—not generic trends
            </p>
          </div>

          {/* Value Prop 2: Time Savings */}
          <div className="text-center">
            <div className="relative w-full aspect-[4/5] bg-neutral-100 rounded-lg overflow-hidden mb-6">
              <Image
                src="/placeholder-time.jpg"
                alt="Time saved"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="text-4xl mb-4">⏱️</div>
            <h3 className="font-medium mb-3 uppercase tracking-wide text-base">20+ Hours Saved</h3>
            <p className="text-base text-neutral-600 leading-relaxed">
              Skip endless browsing. Get 12 pieces that work together in minutes, not days
            </p>
          </div>

          {/* Value Prop 3: Price Control */}
          <div className="text-center">
            <div className="relative w-full aspect-[4/5] bg-neutral-100 rounded-lg overflow-hidden mb-6">
              <Image
                src="/placeholder-budget.jpg"
                alt="Budget control"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="text-4xl mb-4">💰</div>
            <h3 className="font-medium mb-3 uppercase tracking-wide text-base">Your Budget</h3>
            <p className="text-base text-neutral-600 leading-relaxed">
              Tell us your price range. We'll only show pieces within it—no surprises
            </p>
          </div>
        </div>

        {/* Price Transparency */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-10 md:p-16 max-w-4xl mx-auto mb-24">
          <h3 className="text-2xl md:text-3xl font-medium mb-8 text-center uppercase tracking-wide">
            Price Ranges We Work With
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">$</div>
              <div className="text-sm text-neutral-600 uppercase tracking-wide mb-1">Budget-friendly</div>
              <div className="text-sm text-neutral-500">Starting at $20</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">$$</div>
              <div className="text-sm text-neutral-600 uppercase tracking-wide mb-1">Mid-range</div>
              <div className="text-sm text-neutral-500">$30-$80</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">$$$</div>
              <div className="text-sm text-neutral-600 uppercase tracking-wide mb-1">Premium</div>
              <div className="text-sm text-neutral-500">$80-$200</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">$$$$</div>
              <div className="text-sm text-neutral-600 uppercase tracking-wide mb-1">Luxury</div>
              <div className="text-sm text-neutral-500">$200+</div>
            </div>
          </div>
        </div>

        {/* Lifestyle Image Placeholder */}
        <div className="relative w-full aspect-[16/9] bg-neutral-100 rounded-lg overflow-hidden mb-16 max-w-5xl mx-auto">
          <Image
            src="/placeholder-lifestyle.jpg"
            alt="Style drop examples"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1280px"
          />
        </div>

        {/* Brand Credibility */}
        <div className="text-center mb-16">
          <p className="text-base text-neutral-500 mb-6 uppercase tracking-wide">
            Featuring brands you know and trust
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-sm md:text-base text-neutral-700">
            <span className="font-medium">Madewell</span>
            <span>•</span>
            <span className="font-medium">Free People</span>
            <span>•</span>
            <span className="font-medium">Everlane</span>
            <span>•</span>
            <span className="font-medium">Reformation</span>
            <span>•</span>
            <span className="font-medium">Aritzia</span>
            <span>•</span>
            <span className="font-medium">J.Crew</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline font-medium">Sezane</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline font-medium">And 90+ more</span>
          </div>
        </div>

        {/* Final CTA with De-risking */}
        <div className="text-center">
          <Link
            href="/quiz"
            className="inline-block px-10 py-5 bg-black text-white hover:bg-neutral-900 transition-colors font-medium text-lg uppercase tracking-wide"
          >
            Get my free drop
          </Link>
          <p className="text-base text-neutral-500 mt-4">
            No subscription • No commitment • Free to try
          </p>
        </div>
      </div>
    </div>
  );
}
