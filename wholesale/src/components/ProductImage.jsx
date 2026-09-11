import { ImageOff } from 'lucide-react';

export default function ProductImage({ product, className = 'h-52' }) {
  return (
    <div className={`w-full ${className} rounded-2xl overflow-hidden flex items-center justify-center bg-[#f3dfb0]`}>
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain bg-white"
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-[#b9791a] gap-2">
          <ImageOff size={38} />
          <span className="text-xs font-semibold">No image</span>
        </div>
      )}
    </div>
  );
}
