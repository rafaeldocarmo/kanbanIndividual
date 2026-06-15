"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createLink, createNote, createReminder } from "@/app/actions/notes";
import { useNotesContext } from "@/components/notes/notes-shell";

type Tab = "note" | "reminder" | "link";

const TABS: { id: Tab; label: string }[] = [
  { id: "note", label: "Nota" },
  { id: "reminder", label: "Lembrete" },
  { id: "link", label: "Link" },
];

function newId(prefix: string) {
  return `temp-${prefix}-${crypto.randomUUID()}`;
}

export function NoteComposer() {
  const { mutate } = useNotesContext();
  const [tab, setTab] = React.useState<Tab>("note");

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-sm sm:p-4">
      <div
        role="tablist"
        aria-label="Tipo de item"
        className="mb-3 inline-flex rounded-md bg-[var(--color-muted)] p-0.5"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded px-3 py-1 text-sm transition",
              tab === t.id
                ? "bg-[var(--color-card)] font-medium text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "note" && <NoteForm mutate={mutate} />}
      {tab === "reminder" && <ReminderForm mutate={mutate} />}
      {tab === "link" && <LinkForm mutate={mutate} />}
    </div>
  );
}

type Mutate = ReturnType<typeof useNotesContext>["mutate"];

function NoteForm({ mutate }: { mutate: Mutate }) {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const contentRef = React.useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Escreva algo na nota");
      contentRef.current?.focus();
      return;
    }
    const now = new Date();
    const t = title.trim() || null;
    mutate(
      {
        kind: "note",
        op: "upsert",
        note: {
          id: newId("note"),
          title: t,
          content: trimmed,
          createdAt: now,
          updatedAt: now,
        },
      },
      () => createNote({ title: t, content: trimmed }),
    );
    setTitle("");
    setContent("");
    contentRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (opcional)"
        className="sm:w-56"
      />
      <Textarea
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Escreva uma nota… (Ctrl+Enter salva)"
        className="min-h-[64px] flex-1"
      />
      <Button onClick={submit} className="self-start sm:self-stretch">
        Salvar
      </Button>
    </div>
  );
}

function ReminderForm({ mutate }: { mutate: Mutate }) {
  const [content, setContent] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const contentRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Escreva um lembrete");
      contentRef.current?.focus();
      return;
    }
    const now = new Date();
    const due = dueDate || null;
    mutate(
      {
        kind: "reminder",
        op: "upsert",
        reminder: {
          id: newId("reminder"),
          content: trimmed,
          dueDate: due,
          done: false,
          createdAt: now,
          updatedAt: now,
        },
      },
      () => createReminder({ content: trimmed, dueDate: due, done: false }),
    );
    setContent("");
    setDueDate("");
    contentRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        ref={contentRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="O que lembrar? (Enter salva)"
        className="flex-1"
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="sm:w-44"
        aria-label="Data do lembrete"
      />
      <Button onClick={submit}>Salvar</Button>
    </div>
  );
}

function LinkForm({ mutate }: { mutate: Mutate }) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [category, setCategory] = React.useState("");
  const titleRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    const t = title.trim();
    const u = url.trim();
    if (!t) {
      toast.error("Informe um título");
      titleRef.current?.focus();
      return;
    }
    if (!u) {
      toast.error("Informe uma URL");
      return;
    }
    const now = new Date();
    const cat = category.trim() || null;
    mutate(
      {
        kind: "link",
        op: "upsert",
        link: {
          id: newId("link"),
          title: t,
          url: u,
          category: cat,
          createdAt: now,
          updatedAt: now,
        },
      },
      () => createLink({ title: t, url: u, category: cat }),
    );
    setTitle("");
    setUrl("");
    setCategory("");
    titleRef.current?.focus();
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={onEnter}
        placeholder="Título"
        className="sm:w-48"
      />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={onEnter}
        placeholder="URL (ex.: confluence.interno/mops)"
        className="flex-1"
      />
      <Input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onKeyDown={onEnter}
        placeholder="Categoria (opcional)"
        className="sm:w-44"
      />
      <Button onClick={submit}>Salvar</Button>
    </div>
  );
}
