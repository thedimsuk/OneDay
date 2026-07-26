"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({
  id,
  name = "password",
  autoComplete = "current-password",
  required = false,
  ariaLabelledBy,
}: {
  id?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  ariaLabelledBy?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        aria-labelledby={ariaLabelledBy}
        className="h-12 w-full rounded-md border-2 border-ink bg-paper px-3 pr-12 font-bold outline-none focus:bg-acid/20"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Sembunyikan password" : "Lihat password"}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md border-2 border-ink bg-paper transition hover:bg-acid"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
