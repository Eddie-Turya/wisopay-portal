// Small stand-ins for the Next.js APIs the ZawaPay views use, built on React Router.
// ZawaPay's paths live under /portal; WisoPay's portal is served from the site root, so "/portal/x" maps to "/x".
import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useSearchParams as useRRSearchParams } from 'react-router-dom'

export const toRoute = (href: string) => {
  if (/^https?:|^mailto:|^tel:|^#/.test(href)) return href
  const p = href.replace(/^\/portal(?=\/|\?|$)/, '')
  return p === '' || p.startsWith('?') ? `/${p}` : p
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string; scroll?: boolean; prefetch?: boolean }

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, scroll: _s, prefetch: _p, ...rest }, ref) {
  const to = toRoute(href)
  if (/^https?:|^mailto:|^tel:|^#/.test(to)) return <a ref={ref} href={to} {...rest} />
  return <RouterLink ref={ref} to={to} {...rest} />
})
export default Link

export function useRouter() {
  const navigate = useNavigate()
  return {
    push: (href: string) => navigate(toRoute(href)),
    replace: (href: string, _o?: { scroll?: boolean }) => navigate(toRoute(href), { replace: true }),
    back: () => navigate(-1),
  }
}

/** The ZawaPay views compare against "/portal/…" paths. */
export function usePathname() {
  const { pathname } = useLocation()
  return pathname === '/' || pathname === '/dashboard' ? '/portal' : `/portal${pathname}`
}

export function useSearchParams() {
  return useRRSearchParams()[0]
}
