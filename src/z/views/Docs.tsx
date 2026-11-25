import { tr } from "../i18n";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "../ui";
import { ApiDocs } from "../../docs/ApiDocs";

/** The full API docs inside the portal (same content as wisopay.io/docs). */
export function Docs() {
  return (
    <>
      <PageHeader
        title={tr("API docs")}
        sub={tr("Everything you need to take payments and refunds from your own code.")}
        actions={
          <a href="https://wisopay.io/docs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium text-p-muted hover:bg-p-panel2 hover:text-p-fg">
            {tr("Open public copy")} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        }
      />
      <ApiDocs keysHref="/developers" webhooksHref="/developers?tab=webhooks" topOffset={96} />
    </>
  );
}
