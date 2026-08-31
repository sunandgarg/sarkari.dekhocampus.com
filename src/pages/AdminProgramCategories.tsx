import { AdminLayout } from "@/components/AdminLayout";
import { SimpleTableAdmin } from "@/components/admin/SimpleTableAdmin";

/**
 * Upgrade Yourself → Categories (tiles shown above the programme grid).
 * Admins control name, emoji/icon, order, and active state.
 * Each `promoted_programs` row links to one via `category_slug` so the front-end
 * filter aligns cards under their tapped chip.
 */
export function ProgramCategoriesManager({ onChanged }: { onChanged?: () => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Programme categories and logos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the category tiles shown above the Upgrade Yourself programmes. Upload a logo, paste an image URL, or choose an existing image from the library.
        </p>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Admin-uploaded artwork takes priority over the built-in category fallback. Recommended: a clear square image with a light background.
      </p>
      <SimpleTableAdmin
        table="program_categories"
        titleKey="name"
        subtitleKey="slug"
        orderBy={{ column: "display_order" }}
        defaultValues={{ slug: "", name: "", icon_emoji: "🎓", icon_url: "", display_order: 0, is_active: true }}
        ioColumns={["slug","name","icon_emoji","icon_url","display_order","is_active"]}
        ioTypeHints={{ display_order: "number", is_active: "boolean" }}
        onChanged={onChanged}
        fields={[
          { key: "name", label: "Name", required: true, placeholder: "Agentic AI" },
          { key: "slug", label: "Slug", required: true, placeholder: "agentic-ai" },
          { key: "icon_emoji", label: "Icon emoji (fallback)", placeholder: "🤖" },
          { key: "icon_url", label: "Category logo / artwork", type: "image", folder: "program-categories", placeholder: "Upload or paste URL" },
          { key: "display_order", label: "Display Order", type: "number" },
        ]}
      />
    </section>
  );
}

export default function AdminProgramCategories() {
  return (
    <AdminLayout title="Upgrade Yourself with IIT / IIM / Dr. Tag">
      <ProgramCategoriesManager />
    </AdminLayout>
  );
}
