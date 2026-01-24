import Link from 'next/link';
import Image from 'next/image';
import StyleDropsShowcase from '@/components/StyleDropsShowcase';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32 overflow-hidden">
        {/* Hero Content - Split Layout */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center mb-20">
          {/* Left Side - Text Content */}
          <div className="relative z-10 text-center md:text-left">
            <h1 className="text-7xl md:text-8xl font-serif font-bold mb-8 tracking-tight bg-gradient-to-b from-neutral-900 to-neutral-700 bg-clip-text text-transparent">
              StyleRun
            </h1>
            
            {/* Primary Value Prop - Specific Pain Point */}
            <h2 className="text-3xl md:text-5xl font-medium mb-6 text-neutral-900 max-w-3xl leading-tight">
              Personal styling that actually works
            </h2>
            
            <p className="text-xl md:text-2xl text-neutral-600 mb-10 max-w-2xl leading-relaxed">
              Get 6 outfit ideas personalized to you in 2 minutes—no subscription, no styling fee, no waiting. See how your stylist puts looks together.
            </p>

            {/* De-risking CTA */}
            <div className="mb-16">
              <Link
                href="/quiz"
                className="inline-block px-10 py-5 bg-black text-white hover:bg-neutral-900 transition-colors font-medium text-lg uppercase tracking-wide shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Get Styled
              </Link>
              <p className="text-base text-neutral-500 mt-4">
                Free • No subscription • Takes 2 minutes
              </p>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 md:gap-8 text-sm md:text-base text-neutral-500 mb-16">
              <span>No styling fee</span>
              <span>•</span>
              <span>Instant results</span>
              <span>•</span>
              <span>Shop anywhere</span>
            </div>
          </div>

          {/* Right Side - Style Images Grid */}
          <div className="relative z-10 hidden md:block">
            <div className="grid grid-cols-2 gap-4">
              {/* Top Left - Classic Style */}
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-neutral-200 shadow-lg hover:shadow-xl transition-shadow group">
                <Image
                  src="/styles/classic.png"
                  alt="Classic style inspiration"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 0vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Top Right - Minimalist Style */}
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-neutral-200 shadow-lg hover:shadow-xl transition-shadow group mt-8">
                <Image
                  src="/styles/minimalist.png"
                  alt="Minimalist style inspiration"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 0vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Bottom Left - Preppy Style */}
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-neutral-200 shadow-lg hover:shadow-xl transition-shadow group -mt-4">
                <Image
                  src="/styles/preppy.png"
                  alt="Preppy style inspiration"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 0vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Bottom Right - Streetwear Style */}
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-neutral-200 shadow-lg hover:shadow-xl transition-shadow group mt-4">
                <Image
                  src="/styles/streetwear.png"
                  alt="Streetwear style inspiration"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 0vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>

          {/* Mobile - Single Hero Image */}
          <div className="relative z-10 md:hidden mt-8">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-neutral-200 shadow-lg">
              <Image
                src="/styles/classic.png"
                alt="Style inspiration"
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </div>
        </div>


        {/* Style Drops Showcase */}
        <StyleDropsShowcase />

        {/* Value Props Grid */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 max-w-4xl mx-auto mb-24">
          {/* Value Prop 1: Complete Outfits */}
          <div className="text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="font-medium mb-3 uppercase tracking-wide text-base">Complete Outfits, Not Random Items</h3>
            <p className="text-base text-neutral-600 leading-relaxed">
              AI generates 6 complete outfit ideas in 2 minutes. Each look includes 4 pieces that work together—curated for your style, body type, and occasions
            </p>
          </div>

          {/* Value Prop 2: Price Transparency */}
          <div className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="font-medium mb-3 uppercase tracking-wide text-base">Shop Anywhere, Or Nowhere</h3>
            <p className="text-base text-neutral-600 leading-relaxed">
              Get 6 complete looks you can buy anywhere (or nowhere), immediately. See all prices upfront. No hidden fees, no commitment
            </p>
          </div>
        </div>

        {/* Value Props Section */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-10 md:p-16 max-w-5xl mx-auto mb-24">
          <h3 className="text-2xl md:text-3xl font-medium mb-10 text-center uppercase tracking-wide">
            Why StyleRun?
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-black shrink-0">⚡</div>
                <div>
                  <h4 className="font-medium text-base uppercase tracking-wide mb-1">Instant Results</h4>
                  <p className="text-sm text-neutral-600">Get styled in 2 minutes, not 2 weeks. No waiting for shipping or returns.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-black shrink-0">💰</div>
                <div>
                  <h4 className="font-medium text-base uppercase tracking-wide mb-1">Completely Free</h4>
                  <p className="text-sm text-neutral-600">No styling fees, no subscriptions, no commitment. Just free personalized recommendations.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-black shrink-0">🛍️</div>
                <div>
                  <h4 className="font-medium text-base uppercase tracking-wide mb-1">Shop Anywhere</h4>
                  <p className="text-sm text-neutral-600">Buy the pieces you love from any retailer, or don't buy anything at all. Your choice.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-black shrink-0">🎯</div>
                <div>
                  <h4 className="font-medium text-base uppercase tracking-wide mb-1">Complete Outfits</h4>
                  <p className="text-sm text-neutral-600">6 outfit ideas, each with 4 pieces that work together as cohesive looks, not random items.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-black shrink-0">🎨</div>
                <div>
                  <h4 className="font-medium text-base uppercase tracking-wide mb-1">AI-Powered</h4>
                  <p className="text-sm text-neutral-600">Personalized to your style, body type, budget, and occasions—all in minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-black shrink-0">✨</div>
                <div>
                  <h4 className="font-medium text-base uppercase tracking-wide mb-1">No Returns Needed</h4>
                  <p className="text-sm text-neutral-600">See everything before you buy. No surprises, no repacking, no shipping back.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Credibility - Prominent Section */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-12 md:p-20 max-w-6xl mx-auto mb-24">
          <h3 className="text-3xl md:text-4xl font-medium mb-4 text-center uppercase tracking-wide text-neutral-900">
            Featuring Brands You Know and Trust
          </h3>
          <p className="text-base md:text-lg text-neutral-600 mb-10 text-center max-w-2xl mx-auto">
            Shop from your favorite retailers—we curate pieces from 100+ trusted brands
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8 lg:gap-10">
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900">Madewell</span>
            <span className="text-neutral-300 text-xl">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900">Free People</span>
            <span className="text-neutral-300 text-xl">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900">Everlane</span>
            <span className="text-neutral-300 text-xl">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900">Reformation</span>
            <span className="text-neutral-300 text-xl">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900">Aritzia</span>
            <span className="text-neutral-300 text-xl">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900">J.Crew</span>
            <span className="text-neutral-300 text-xl hidden md:inline">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900 hidden md:inline">Sezane</span>
            <span className="text-neutral-300 text-xl hidden lg:inline">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900 hidden lg:inline">& Other Stories</span>
            <span className="text-neutral-300 text-xl hidden lg:inline">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900 hidden lg:inline">COS</span>
            <span className="text-neutral-300 text-xl hidden lg:inline">•</span>
            <span className="text-lg md:text-xl lg:text-2xl font-semibold text-neutral-900 hidden lg:inline">Banana Republic</span>
          </div>
          <p className="text-center mt-8 text-base md:text-lg text-neutral-600 font-medium">
            And 90+ more trusted brands
          </p>
        </div>

        {/* Final CTA with De-risking */}
        <div className="text-center">
          <Link
            href="/quiz"
            className="inline-block px-10 py-5 bg-black text-white hover:bg-neutral-900 transition-colors font-medium text-lg uppercase tracking-wide"
          >
            Get Styled
          </Link>
          <p className="text-base text-neutral-500 mt-4">
            No subscription • No commitment • Free to try
          </p>
        </div>
      </div>
    </div>
  );
}
