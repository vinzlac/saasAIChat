"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_HOBBIES = 10;

interface HobbiesInputProps {
  value: string[];
  onChange: (hobbies: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function HobbiesInput({
  value,
  onChange,
  disabled,
  className,
}: HobbiesInputProps) {
  const [input, setInput] = useState("");

  function handleAdd(e: React.KeyboardEvent | React.MouseEvent) {
    const hobby = input.trim();
    if (!hobby || value.length >= MAX_HOBBIES) return;
    if (value.includes(hobby)) return;
    onChange([...value, hobby]);
    setInput("");
  }

  function handleRemove(hobby: string) {
    onChange(value.filter((h) => h !== hobby));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd(e))}
          placeholder="Ajouter un passe-temps"
          disabled={disabled || value.length >= MAX_HOBBIES}
          maxLength={50}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleAdd}
          disabled={disabled || !input.trim() || value.length >= MAX_HOBBIES}
        >
          Ajouter
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((hobby) => (
            <span
              key={hobby}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
            >
              {hobby}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(hobby)}
                  className="rounded-full p-0.5 hover:bg-muted"
                  aria-label={`Supprimer ${hobby}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {value.length >= MAX_HOBBIES && (
        <p className="text-xs text-muted-foreground">
          Maximum {MAX_HOBBIES} passe-temps
        </p>
      )}
    </div>
  );
}
