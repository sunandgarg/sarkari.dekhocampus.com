import { memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface UrlQrCodeModalProps {
  url: {
    id: string;
    short_code: string;
    original_url: string;
    title: string | null;
    header?: string | null;
  };
  open: boolean;
  onClose: () => void;
}

export const UrlQrCodeModal = memo(function UrlQrCodeModal({ url, open, onClose }: UrlQrCodeModalProps) {
  const shortUrl = url.header 
    ? `${window.location.origin}/s/${url.header}/${url.short_code}`
    : `${window.location.origin}/s/${url.short_code}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=${encodeURIComponent(shortUrl)}`;

  const handleDownload = async () => {
    const response = await fetch(qrImageUrl);
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `qr-${url.short_code}.png`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription className="break-all">
            {url.title || shortUrl}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <img 
            src={qrImageUrl} 
            alt={`QR code for ${shortUrl}`}
            className="w-64 h-64 rounded-lg border bg-white"
          />
          
          <p className="text-sm text-muted-foreground text-center font-mono">
            {shortUrl}
          </p>
          
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default UrlQrCodeModal;
