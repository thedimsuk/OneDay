"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";

type FooterWhatsAppBoxProps = {
  phoneNumber: string;
};

export function FooterWhatsAppBox({ phoneNumber }: FooterWhatsAppBoxProps) {
  const [message, setMessage] = useState("");

  const whatsappUrl = useMemo(() => {
    const text = message.trim() || "Halo ONEDAY, saya ingin bertanya tentang pesanan/produk.";
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}`;
  }, [message, phoneNumber]);

  return (
    <form className="grid gap-3" onSubmit={(event) => event.preventDefault()}>
      <label className="text-sm font-black uppercase text-ink/55" htmlFor="footer-whatsapp-message">
        Pesan cepat
      </label>
      <textarea
        id="footer-whatsapp-message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={500}
        rows={4}
        className="min-h-28 resize-none rounded-md border-2 border-ink bg-paper p-3 text-sm font-semibold outline-none transition focus:bg-bone focus:ring-2 focus:ring-acid"
        placeholder="Tulis pesan untuk ONEDAY..."
      />
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid px-4 font-black shadow-hard transition hover:-translate-y-0.5"
      >
        <Send className="h-4 w-4" />
        Kirim via WhatsApp
      </a>
    </form>
  );
}
