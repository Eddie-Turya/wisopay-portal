// The portal shell (sidebar, top bar, test-mode banner) now comes from src/z/Shell.tsx, which wraps every signed-in route.
// WisoPay pages that still wrap themselves in <Layout> render inside it; this cancels the shell's page padding,
// because those pages bring their own.
export function Layout({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 -my-6 sm:-mx-6 sm:-my-8">{children}</div>
}
