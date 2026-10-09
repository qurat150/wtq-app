"use client";

import type { FormEvent } from "react";
import { Button, Textarea } from "@/components/ui";
import { INPUT_PLACEHOLDER } from "../prompt";
import { MAX_INPUT_LENGTH } from "../schema";

type InputFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

// Controlled input: the parent owns the text state (same as RN's value + onChangeText).
export function InputForm({ value, onChange, onSubmit, loading }: InputFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Web-only: a <form> submit reloads the whole page by default. Stop that.
    event.preventDefault();
    onSubmit();
  }

  // Using a real <form> means pressing Enter in a field submits it, for free.
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Label for screen readers; sr-only hides it visually. htmlFor = id of the input. */}
      <label htmlFor="generator-input" className="sr-only">
        Your input
      </label>
      <Textarea
        id="generator-input"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={INPUT_PLACEHOLDER}
        maxLength={MAX_INPUT_LENGTH} // same limit as the zod schema
        disabled={loading}
      />
      <Button type="submit" loading={loading} disabled={!value.trim()} className="w-full">
        {loading ? "Generating..." : "Generate"}
      </Button>
    </form>
  );
}
