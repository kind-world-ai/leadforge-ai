import type { PainSignal } from "@/lib/types";

export interface SignalSolution {
  fix: string;
  impact: string;
}

/** Maps every audit signal to a concrete fix + plain-language business impact. */
const solutionRules: { match: (id: string) => boolean; solution: SignalSolution }[] = [
  {
    match: (id) => id === "psi-mobile-slow" || id === "psi-mobile-mediocre",
    solution: {
      fix: "Compress and lazy-load images, remove unused scripts, enable caching and a CDN. On WordPress this is a defined optimisation project, not a rebuild.",
      impact: "Google research shows 53% of mobile visitors abandon pages that take over 3 seconds — faster pages directly recover lost enquiries and improve ad ROI."
    }
  },
  {
    match: (id) => id === "psi-mobile-lcp",
    solution: {
      fix: "Optimise the largest above-the-fold element (usually the hero image): serve it in WebP, preload it, and right-size it for phones.",
      impact: "LCP is a Google ranking factor — fixing it improves both visitor patience and search position."
    }
  },
  {
    match: (id) => id === "psi-desktop-slow",
    solution: {
      fix: "Same optimisation pass as mobile: image compression, script cleanup, caching. Desktop usually improves as a side effect of the mobile work.",
      impact: "Slow desktop pages hurt the visitors who research seriously — often your highest-value customers."
    }
  },
  {
    match: (id) => id === "psi-seo-issues",
    solution: {
      fix: "Run through Google's Lighthouse SEO checklist: meta tags, crawlability, descriptive links, mobile friendliness. Mostly small, fast edits.",
      impact: "Each fix removes a reason for Google to rank a competitor above you."
    }
  },
  {
    match: (id) => id === "psi-accessibility",
    solution: {
      fix: "Fix colour contrast, image alt text, and form labels — typically a one-day cleanup.",
      impact: "Accessible sites reach more customers and avoid increasing legal exposure around accessibility compliance."
    }
  },
  {
    match: (id) => id === "no-website",
    solution: {
      fix: "Launch a fast one-page website with your services, photos, reviews, and a tap-to-call button — then connect it to your Google Business Profile.",
      impact: "Businesses without a website are invisible for the majority of customers who search online before contacting anyone."
    }
  },
  {
    match: (id) => id === "website-unreachable" || id.startsWith("bad-status") || id.startsWith("crawl-status"),
    solution: {
      fix: "Restore hosting/DNS so the site loads reliably, and add uptime monitoring so you know within minutes if it goes down again.",
      impact: "Every hour the site is down, searchers assume the business has closed and call the next result."
    }
  },
  {
    match: (id) => id === "no-ssl",
    solution: {
      fix: "Install a free SSL certificate (Let's Encrypt) and force https on every page.",
      impact: "Browsers label http sites 'Not secure' — an instant trust killer — and Google ranks insecure sites lower."
    }
  },
  {
    match: (id) => id === "weak-title",
    solution: {
      fix: "Write a 50–60 character title: \"[Service] in [City] | [Business Name]\" — a five-minute change in the site settings.",
      impact: "The title tag is the #1 on-page ranking signal. An empty one means Google guesses what you do — and usually guesses wrong."
    }
  },
  {
    match: (id) => id === "weak-description",
    solution: {
      fix: "Write a 140–155 character meta description that names your service, city, and a reason to choose you.",
      impact: "This is your free ad in Google results — a good one measurably lifts how many searchers click you instead of competitors."
    }
  },
  {
    match: (id) => id === "h1-issue" || id.startsWith("crawl-h1"),
    solution: {
      fix: "Add exactly one clear H1 per page that states the offer: \"Real Estate Agents in Parramatta\", not \"Welcome\".",
      impact: "Headings tell Google and visitors instantly what the page is about — unclear structure costs rankings and attention."
    }
  },
  {
    match: (id) => id === "no-viewport",
    solution: {
      fix: "Add the responsive viewport tag and verify the layout on a real phone.",
      impact: "Without it, phones show a shrunken desktop page — most visitors pinch, squint, and leave."
    }
  },
  {
    match: (id) => id === "weak-conversion" || id === "crawler-no-cta" || id === "crawler-no-contact-path",
    solution: {
      fix: "Add a clear next step on every page: tap-to-call button, short enquiry form, and a visible 'Get a quote' CTA above the fold.",
      impact: "Traffic without a conversion path is rented attention — small CTA fixes routinely lift enquiries 20–50%."
    }
  },
  {
    match: (id) => id === "no-schema",
    solution: {
      fix: "Add LocalBusiness structured data (name, address, hours, reviews) — a small code snippet.",
      impact: "Schema unlocks rich results (stars, hours, location) that make your listing bigger and more clickable in Google."
    }
  },
  {
    match: (id) => id === "no-analytics",
    solution: {
      fix: "Install Google Analytics 4 + Search Console (free, ~30 minutes).",
      impact: "Right now every marketing decision is a guess — analytics shows which channels actually bring customers."
    }
  },
  {
    match: (id) => id === "slow-heavy-page",
    solution: {
      fix: "Reduce page weight: compress images, remove unused plugins/scripts, enable caching.",
      impact: "Heavy pages are slow pages — and slow pages lose both visitors and rankings."
    }
  },
  {
    match: (id) => id === "builder-refresh",
    solution: {
      fix: "Rebuild the key pages on a faster, SEO-controllable stack (or heavily optimise the current builder setup).",
      impact: "Template-builder sites often cap your speed and SEO ceiling — competitors on faster stacks outrank and outconvert them."
    }
  },
  {
    match: (id) => id.startsWith("thin-page") || id === "crawler-site-thin-content",
    solution: {
      fix: "Expand key pages to 300+ words of genuinely useful content: services, areas served, FAQs, proof. Add one page per location/service you want to rank for.",
      impact: "Google won't rank pages with nothing on them — content depth is how you win the searches that bring customers."
    }
  },
  {
    match: (id) => id === "crawler-no-social-proof",
    solution: {
      fix: "Add reviews, testimonials, ratings badges, and recognisable client/partner logos near your CTAs.",
      impact: "Social proof is often the deciding factor — visitors trust other customers more than any marketing copy."
    }
  },
  {
    match: (id) => id === "weak-contact",
    solution: {
      fix: "Publish a direct phone number and email prominently on every page (header + footer).",
      impact: "If contacting you takes effort, the customer contacts the competitor where it doesn't."
    }
  }
];

const fallback: SignalSolution = {
  fix: "Address this in the priority order shown in the action plan — most of these items are quick, well-understood fixes.",
  impact: "Each resolved issue removes one more reason for customers to choose a competitor."
};

export function solutionFor(signal: PainSignal): SignalSolution {
  return solutionRules.find((rule) => rule.match(signal.id))?.solution ?? fallback;
}
