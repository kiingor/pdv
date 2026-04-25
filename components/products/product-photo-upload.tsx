"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

export type SelectedPhoto = {
  file: File;
  previewUrl: string;
};

type Props = {
  /** URL da foto já cadastrada (modo edição). */
  existingUrl?: string | null;
  /** Foto selecionada (ainda não enviada). */
  selected: SelectedPhoto | null;
  onSelect: (photo: SelectedPhoto | null) => void;
  disabled?: boolean;
};

/**
 * Área drag-and-drop / clique para selecionar foto do produto.
 * Faz validação local (imagem + 5MB) — upload acontece no submit do form.
 */
export function ProductPhotoUpload({
  existingUrl,
  selected,
  onSelect,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const previewUrl = selected?.previewUrl ?? existingUrl ?? null;

  function validate(file: File): string | null {
    if (!file.type.startsWith("image/")) {
      return "Selecione uma imagem (JPG, PNG, WebP).";
    }
    if (file.size > MAX_BYTES) {
      return "Imagem muito grande. Máximo 5MB.";
    }
    return null;
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validate(file);
    if (err) {
      toast.error("Foto inválida", { description: err });
      return;
    }
    if (selected?.previewUrl) {
      URL.revokeObjectURL(selected.previewUrl);
    }
    onSelect({ file, previewUrl: URL.createObjectURL(file) });
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  function handleRemove() {
    if (selected?.previewUrl) {
      URL.revokeObjectURL(selected.previewUrl);
    }
    onSelect(null);
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
      />

      {previewUrl ? (
        <div className="flex items-start gap-3">
          <div className="relative h-32 w-32 overflow-hidden rounded-lg ring-1 ring-foreground/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Pré-visualização"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={openPicker}
              disabled={disabled}
            >
              <Upload className="h-4 w-4" />
              Trocar
            </Button>
            {selected && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemove}
                disabled={disabled}
                aria-label="Descartar foto selecionada"
              >
                <X className="h-4 w-4" />
                Descartar
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          aria-disabled={disabled}
          className={cn(
            "flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
            dragOver && "border-primary/60 bg-primary/5 text-foreground",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <ImagePlus className="h-6 w-6" />
          <p className="font-medium text-foreground">
            Toque para escolher ou arraste uma foto
          </p>
          <p className="text-xs">PNG, JPG ou WebP até 5MB</p>
        </div>
      )}
    </div>
  );
}

/**
 * Faz upload do arquivo no Convex storage.
 * Retorna o storageId que deve ser passado para create/update.
 */
export async function uploadPhotoToConvex(
  file: File,
  uploadUrl: string,
): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Falha ao enviar foto (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { storageId?: string };
  if (!json.storageId) {
    throw new Error("Resposta de upload sem storageId.");
  }
  return json.storageId;
}

