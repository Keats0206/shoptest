import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <span className="text-xl font-serif font-bold tracking-tight">
                ShopPal
              </span>
            </Link>
            <p className="text-sm text-neutral-600">
              Instant personal styling—free, no commitment, shop anywhere
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-medium mb-4 uppercase tracking-wide">
              Navigation
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Take Quiz
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-medium mb-4 uppercase tracking-wide">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-neutral-200">
          <p className="text-xs text-neutral-500 text-center">
            © {currentYear} ShopPal. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

