import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { useState, ChangeEvent } from 'react';
import { uploadImageApi } from '../lib/api';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
}

export function ImageUpload({ value, onChange, className = '', label = 'Upload Photo' }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await uploadImageApi(base64);
          onChange(res.url);
        } catch (err: any) {
          setError(err?.message || 'Failed to upload image');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to read image file');
      setLoading(false);
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-xs font-bold uppercase tracking-wider text-muted">{label}</label>}
      {value ? (
        <div className="relative group overflow-hidden rounded-2xl border border-zinc-200 bg-surface">
          <img src={value} alt="Uploaded" className="h-40 w-full object-cover transition group-hover:scale-105" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white shadow-md hover:bg-black"
            title="Remove image"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-zinc-300 bg-surface hover:bg-orange-50/50 hover:border-brand-500 cursor-pointer transition">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-brand-600">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-xs font-semibold">Uploading to Cloudinary...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted">
              <Upload className="size-6 text-brand-500" />
              <span className="text-xs font-semibold text-ink">Click or drop image to upload</span>
              <span className="text-[11px] text-zinc-400">PNG, JPG, WebP up to 5MB</span>
            </div>
          )}
          <input type="file" accept="image/*" disabled={loading} onChange={handleFile} className="hidden" />
        </label>
      )}
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
