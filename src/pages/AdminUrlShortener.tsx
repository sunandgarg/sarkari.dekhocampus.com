import { AdminLayout } from "@/components/AdminLayout";
import { UrlShortenerModule } from "@/components/urlshortener";

export default function AdminUrlShortener() {
  return (
    <AdminLayout title="URL Short">
      <UrlShortenerModule />
    </AdminLayout>
  );
}
