import { useEffect, useState } from 'react'

/*
 * Live repository facts.
 *
 * The only social proof this page can honestly show. There are no customer
 * logos, no testimonials and no traction numbers, so rather than invent any,
 * it shows the one checkable thing: the code is there, it is being worked on,
 * and here is when it was last touched.
 *
 * Unauthenticated GitHub API, so it is rate-limited per IP and will sometimes
 * refuse. That is fine and expected: the component renders its label with no
 * numbers rather than a spinner or an error, because a missing star count is
 * not information anyone came here for. Nothing about the page depends on it.
 */

type Stats = { stars: number; pushedAt: string }

function relative(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  return months === 1 ? 'last month' : `${months} months ago`
}

export function RepoStats({ repo }: { repo: string }) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`https://api.github.com/repos/${repo}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.stargazers_count === 'number') {
          setStats({ stars: d.stargazers_count, pushedAt: d.pushed_at })
        }
      })
      .catch(() => {
        /* rate limited or offline: the band reads fine without numbers */
      })
    return () => ctrl.abort()
  }, [repo])

  if (!stats) return null

  return (
    <span className="l-meta inline-flex items-center gap-4 text-meta">
      <span className="inline-flex items-center gap-1.5">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-[#c9a227]" aria-hidden>
          <path d="M8 .5l2.2 4.6 5 .7-3.6 3.5.9 5L8 11.9 3.5 14.3l.9-5L.8 5.8l5-.7L8 .5z" />
        </svg>
        {stats.stars.toLocaleString()} stars
      </span>
      <span>Last commit {relative(stats.pushedAt)}</span>
    </span>
  )
}
