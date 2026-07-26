"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Save, ShoppingBag } from "lucide-react";
import { createProductAction } from "@/app/admin/products/new/actions";
import { money } from "@/lib/utils";

const sizes = ["S", "M", "L", "XL", "XXL"];
const maxMockupBytes = 1.5 * 1024 * 1024;

type FileInfo = {
  name: string;
  size: number;
  valid: boolean;
  message: string;
};

type FormState = {
  name: string;
  sku: string;
  category: string;
  stock: string;
  price: string;
  discountPrice: string;
  weightGram: string;
  tag: string;
  shortDescription: string;
  description: string;
};

const initialForm: FormState = {
  name: "",
  sku: "",
  category: "",
  stock: "",
  price: "",
  discountPrice: "",
  weightGram: "",
  tag: "new",
  shortDescription: "",
  description: "",
};

export function NewProductForm({ error }: { error?: string }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [previewUrl, setPreviewUrl] = useState("");
  const [backPreviewUrl, setBackPreviewUrl] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [backFileInfo, setBackFileInfo] = useState<FileInfo | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (backPreviewUrl) {
        URL.revokeObjectURL(backPreviewUrl);
      }
    };
  }, [backPreviewUrl, previewUrl]);

  const preview = useMemo(() => {
    const price = Number(form.price) || 0;
    const discountPrice = Number(form.discountPrice) || 0;
    return {
      name: form.name || "Nama Produk",
      category: form.category || "Kategori",
      shortDescription: form.shortDescription || "Deskripsi singkat produk akan tampil di sini.",
      price,
      discountPrice: discountPrice > 0 ? discountPrice : undefined,
      sale: discountPrice > 0 && discountPrice < price,
    };
  }, [form]);
  const canSubmitMockups = Boolean(fileInfo?.valid && backFileInfo?.valid);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function getImageSize(file: File) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new window.Image();
        element.onload = () => resolve(element);
        element.onerror = reject;
        element.src = objectUrl;
      });

      return { width: image.naturalWidth, height: image.naturalHeight };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleFile(file: File | undefined, side: "front" | "back") {
    if (!file) {
      if (side === "front") {
        setFileInfo(null);
        setPreviewUrl("");
      } else {
        setBackFileInfo(null);
        setBackPreviewUrl("");
      }
      return;
    }

    let valid = file.type === "image/webp" && file.size <= maxMockupBytes;
    let message = "";
    if (file.type !== "image/webp") {
      message = "File wajib WebP.";
    } else if (file.size > maxMockupBytes) {
      message = "Ukuran maksimal 1.5 MB.";
    }

    if (valid) {
      try {
        const { width, height } = await getImageSize(file);
        valid = width > 0 && height > 0 && width * 5 === height * 4;
        message = valid ? `${width} x ${height} px, WebP 4:5 valid.` : `Rasio wajib 4:5. File ini ${width} x ${height} px.`;
      } catch {
        valid = false;
        message = "Gambar WebP tidak bisa dibaca.";
      }
    }

    const info = { name: file.name, size: file.size, valid, message };
    const setter = side === "front" ? setPreviewUrl : setBackPreviewUrl;
    if (side === "front") {
      setFileInfo(info);
    } else {
      setBackFileInfo(info);
    }
    setter((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <Link href="/admin" className="inline-flex items-center gap-2 font-black text-cobalt">
        <ArrowLeft className="h-4 w-4" />
        Kembali ke dashboard
      </Link>
      <div className="mt-5">
        <p className="font-black uppercase text-flame">Tambah produk</p>
        <h1 className="font-display text-5xl leading-none md:text-7xl">Posting produk baru.</h1>
        <p className="mt-3 max-w-2xl text-ink/62">
          Isi data produk dan lihat preview postingan sebelum dipublish ke website user.
        </p>
      </div>

      <form action={createProductAction} className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        <section className="space-y-5">
          <Panel title="Informasi produk">
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="name" label="Nama produk" value={form.name} onChange={(value) => updateField("name", value)} required />
              <Field name="sku" label="SKU" value={form.sku} onChange={(value) => updateField("sku", value)} required />
              <Field name="category" label="Kategori" value={form.category} onChange={(value) => updateField("category", value)} required />
              <Field name="stock" label="Stok" type="number" value={form.stock} onChange={(value) => updateField("stock", value)} required />
              <Field name="price" label="Harga" type="number" value={form.price} onChange={(value) => updateField("price", value)} required />
              <Field name="discountPrice" label="Harga diskon" type="number" value={form.discountPrice} onChange={(value) => updateField("discountPrice", value)} />
              <Field name="weightGram" label="Berat gram" type="number" value={form.weightGram} onChange={(value) => updateField("weightGram", value)} required />
              <label className="block">
                <span className="text-xs font-black uppercase text-ink/50">Section website</span>
                <select
                  name="tag"
                  value={form.tag}
                  onChange={(event) => updateField("tag", event.target.value)}
                  className="mt-2 h-12 w-full rounded-md border-2 border-ink bg-paper px-3 font-bold outline-none"
                >
                  <option value="new">Produk Terbaru</option>
                  <option value="popular">Produk Populer</option>
                  <option value="discount">Produk Diskon</option>
                </select>
              </label>
            </div>
          </Panel>

          <Panel title="Deskripsi">
            <div className="grid gap-4">
              <Field
                name="shortDescription"
                label="Deskripsi singkat"
                value={form.shortDescription}
                onChange={(value) => updateField("shortDescription", value)}
                required
              />
              <label className="block">
                <span className="text-xs font-black uppercase text-ink/50">Deskripsi lengkap</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  required
                  className="mt-2 min-h-32 w-full rounded-md border-2 border-ink bg-paper p-3 font-bold outline-none focus:bg-acid/20"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Template ukuran">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="py-3">Size</th>
                    <th>Lebar dada</th>
                    <th>Panjang</th>
                    <th>Bahu</th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((size, index) => (
                    <tr key={size} className="border-b border-ink/10">
                      <td className="py-3 font-black">{size}</td>
                      <td><SmallInput name={`${size}-chest`} defaultValue={50 + index * 3} /></td>
                      <td><SmallInput name={`${size}-length`} defaultValue={68 + index * 3} /></td>
                      <td><SmallInput name={`${size}-shoulder`} defaultValue={43 + index * 2} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>

        <aside className="h-fit rounded-lg border-2 border-ink bg-ink p-5 text-paper shadow-hard">
          <ImagePlus className="h-8 w-8 text-acid" />
          <h2 className="mt-3 font-display text-4xl">Preview postingan</h2>
          <p className="mt-2 text-sm text-paper/58">
            Preview ini mengikuti kartu produk di website user.
          </p>
          <div className="mt-5 rounded-md border border-flame bg-flame/10 p-3 text-sm text-paper">
            <p className="font-black text-flame">Aturan wajib upload</p>
            <p className="mt-1 text-paper/70">Format harus WebP dan rasio harus tepat 4:5.</p>
            <p className="mt-2 text-paper/70">Rekomendasi 1200 x 1500 px. Maksimal 1.5 MB per gambar.</p>
          </div>
          {error ? <MockupError error={error} /> : null}
          <label className="mt-5 block">
            <span className="text-xs font-black uppercase text-paper/50">File mockup depan</span>
            <input
              name="mockup"
              type="file"
              accept="image/webp,.webp"
              required
              onChange={(event) => void handleFile(event.target.files?.[0], "front")}
              className="mt-2 w-full rounded-md border-2 border-paper/20 bg-paper p-3 text-sm font-bold text-ink outline-none"
            />
          </label>
          {fileInfo ? (
            <div className={`mt-3 rounded-md border p-3 text-sm font-bold ${fileInfo.valid ? "border-acid text-acid" : "border-flame text-flame"}`}>
              {fileInfo.name} - {(fileInfo.size / (1024 * 1024)).toFixed(2)} MB
              <span className="mt-1 block">{fileInfo.message}</span>
            </div>
          ) : null}
          <label className="mt-5 block">
            <span className="text-xs font-black uppercase text-paper/50">File mockup belakang</span>
            <input
              name="backMockup"
              type="file"
              accept="image/webp,.webp"
              required
              onChange={(event) => void handleFile(event.target.files?.[0], "back")}
              className="mt-2 w-full rounded-md border-2 border-paper/20 bg-paper p-3 text-sm font-bold text-ink outline-none"
            />
          </label>
          {backFileInfo ? (
            <div className={`mt-3 rounded-md border p-3 text-sm font-bold ${backFileInfo.valid ? "border-acid text-acid" : "border-flame text-flame"}`}>
              {backFileInfo.name} - {(backFileInfo.size / (1024 * 1024)).toFixed(2)} MB
              <span className="mt-1 block">{backFileInfo.message}</span>
            </div>
          ) : null}

          <div className="mt-5 rounded-lg bg-paper p-3 text-ink">
            <p className="mb-3 text-xs font-black uppercase text-flame">Preview foto depan</p>
            <article className="group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border-2 border-ink bg-bone shadow-soft">
                {previewUrl ? (
                  <Image src={previewUrl} alt="Preview produk" fill className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center p-6 text-center text-sm font-bold text-ink/45">
                    Upload mockup untuk melihat preview grid 4:5.
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-full border border-ink bg-paper px-3 py-1 text-xs font-black uppercase">
                  {preview.category}
                </div>
                {preview.sale ? (
                  <div className="absolute right-3 top-3 rounded-full bg-flame px-3 py-1 text-xs font-black uppercase text-white">
                    Sale
                  </div>
                ) : null}
              </div>
              <div className="-mt-14 ml-auto mr-3 grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-acid text-ink shadow-hard">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg leading-tight">{preview.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/62">{preview.shortDescription}</p>
                </div>
                <div className="shrink-0 text-right">
                  {preview.sale ? <p className="text-xs text-ink/45 line-through">{money(preview.price)}</p> : null}
                  <p className="font-black">{money(preview.discountPrice ?? preview.price)}</p>
                </div>
              </div>
            </article>
          </div>
          <div className="mt-4 rounded-lg bg-paper p-3 text-ink">
            <p className="mb-3 text-xs font-black uppercase text-flame">Preview foto belakang</p>
            <div className="grid grid-cols-[88px_1fr] items-center gap-3 rounded-lg border-2 border-ink bg-paper p-2">
              <div className="relative aspect-[4/5] overflow-hidden rounded-md border-2 border-ink bg-bone">
                {backPreviewUrl ? (
                  <Image src={backPreviewUrl} alt="Preview belakang produk" fill className="object-cover" unoptimized />
                ) : (
                  <div className="grid h-full place-items-center p-2 text-center text-[11px] font-bold text-ink/45">
                    Foto belakang
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase text-flame">Thumbnail swap detail produk</p>
                <p className="mt-1 text-sm font-bold text-ink/62">
                  Di halaman user, foto ini akan menjadi tombol kecil di bawah foto utama.
                </p>
              </div>
            </div>
          </div>

          <button
            disabled={!canSubmitMockups}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-acid font-black text-ink transition disabled:cursor-not-allowed disabled:bg-paper/20 disabled:text-paper/35"
          >
            <Save className="h-5 w-5" />
            Posting ke Website
          </button>
        </aside>
      </form>
    </main>
  );
}

function MockupError({ error }: { error: string }) {
  const messages: Record<string, string> = {
    "mockup-required": "File mockup depan wajib diupload.",
    "back-mockup-required": "File mockup belakang wajib diupload.",
    "mockup-type": "Format wajib WebP.",
    "mockup-size": "Ukuran file terlalu besar. Maksimal 1.5 MB per gambar, disarankan di bawah 1 MB.",
    "mockup-content": "File wajib WebP valid dengan rasio tepat 4:5.",
  };

  return (
    <div className="mt-4 rounded-md border border-flame bg-flame/20 p-3 text-sm font-black text-flame">
      {messages[error] ?? "Mockup tidak valid."}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border-2 border-ink bg-paper p-5 shadow-soft">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-ink/50">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 h-12 w-full rounded-md border-2 border-ink bg-paper px-3 font-bold outline-none focus:bg-acid/20"
      />
    </label>
  );
}

function SmallInput({ name, defaultValue }: { name: string; defaultValue: number }) {
  return (
    <input
      name={name}
      type="number"
      defaultValue={defaultValue}
      required
      className="h-10 w-24 rounded-md border-2 border-ink bg-paper px-2 font-bold outline-none"
    />
  );
}
