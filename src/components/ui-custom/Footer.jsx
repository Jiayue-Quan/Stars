import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui-custom/BrandLogo';
export function Footer() {
    return (<footer className="mt-16 border-t border-white/[0.06]" style={{ background: 'rgba(10, 8, 7, 0.92)' }}>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_0.9fr_0.9fr_1fr] lg:gap-12">
          <div>
            <Link to="/" className="group mb-5 flex items-center gap-3">
              <BrandLogo
                showTagline={false}
                markClassName="transition-all duration-300 group-hover:scale-105"
                titleClassName="text-3xl"
              />
            </Link>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Discover</h3>
            <ul className="space-y-3">
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Browse All</Link></li>
              <li><Link to="/explore" className="text-sm text-muted-foreground transition-colors hover:text-white">Explore by Country</Link></li>
              <li><Link to="/lists" className="text-sm text-muted-foreground transition-colors hover:text-white">Editor Lists</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Browse By</h3>
            <ul className="space-y-3">
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Decade</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Genre</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Actors</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Directors</Link></li>
              <li><Link to="/browse" className="text-sm text-muted-foreground transition-colors hover:text-white">Streaming</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Start Here</h3>
            <p className="max-w-xs text-sm leading-7 text-muted-foreground">
              Jump back into live discovery with the sections people actually use most.
            </p>
            <Link to="/browse" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d26d47]/30 bg-[#d26d47]/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-[#d26d47]/45 hover:bg-[#d26d47]/15">
              Open Browse
              <ArrowUpRight className="h-4 w-4"/>
            </Link>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p><Link to="/lists" className="transition-colors hover:text-white">See live collections</Link></p>
              <p><Link to="/watchlist" className="transition-colors hover:text-white">Open your watchlist</Link></p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center md:justify-start">
            <p className="text-sm text-muted-foreground">Copyright 2026 STARS. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>);
}
