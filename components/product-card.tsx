import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Product } from "@/lib/products";
import { money } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const sale = Boolean(product.discountPrice && product.discountPrice < product.price);
  const detailUrl = `/products/${product.id}`;

  return (
    <article className="group">
      <Link href={detailUrl} className="relative block aspect-[4/5] overflow-hidden rounded-lg border-2 border-ink bg-bone shadow-soft">
        <Image
          src={product.thumbnail}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-2 top-2 max-w-[calc(100%-4rem)] rounded-full border border-ink bg-paper px-2 py-1 text-[10px] font-black uppercase leading-none sm:left-3 sm:top-3 sm:px-3 sm:text-xs">
          {product.category}
        </div>
        {sale ? (
          <div className="absolute right-2 top-2 rounded-full bg-flame px-2 py-1 text-[10px] font-black uppercase leading-none text-white sm:right-3 sm:top-3 sm:px-3 sm:text-xs">
            Sale
          </div>
        ) : null}
      </Link>
      <Link
        href={detailUrl}
        aria-label={`Lihat detail ${product.name}`}
        className="-mt-10 ml-auto mr-2 grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-acid text-ink shadow-hard transition hover:-translate-y-0.5 sm:-mt-14 sm:mr-3 sm:h-11 sm:w-11"
      >
        <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
      </Link>
      <div className="mt-2 grid gap-1 sm:mt-3 sm:flex sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <Link href={detailUrl}>
            <h3 className="line-clamp-2 font-display text-base leading-tight hover:text-cobalt sm:text-lg">{product.name}</h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-xs text-ink/62 sm:text-sm">{product.shortDescription}</p>
        </div>
        <div className="shrink-0 text-left sm:max-w-[42%] sm:text-right">
          {sale ? <p className="text-[11px] text-ink/45 line-through sm:text-xs">{money(product.price)}</p> : null}
          <p className="break-words text-sm font-black leading-tight sm:text-base">{money(product.discountPrice ?? product.price)}</p>
        </div>
      </div>
    </article>
  );
}
