"use client";

import * as React from "react";
import { toast } from "sonner";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeam } from "@/components/team/team-provider";
import { KNOWLEDGE_KINDS } from "@/lib/types";
import type { Journey, Knowledge, KnowledgeKind } from "@/db/schema";

const GERAL = "__geral__";

/**
 * Formulário de criar/editar. Ocupa o mesmo lugar do painel de leitura — a
 * lista continua à vista, para consultar outro item enquanto escreve.
 */
export function KnowledgeEditor({
  item,
  journeys,
  defaultJourneyId,
  onCancel,
  onSave,
}: {
  item: Knowledge | null;
  journeys: Journey[];
  defaultJourneyId: string | null;
  onCancel: () => void;
  onSave: (values: {
    title: string;
    content: string;
    journeyId: string | null;
    kind: KnowledgeKind;
  }) => void;
}) {
  const { me } = useTeam();
  const [title, setTitle] = React.useState(item?.title ?? "");
  const [content, setContent] = React.useState(item?.content ?? "");
  const [journeyId, setJourneyId] = React.useState<string | null>(
    item ? item.journeyId : defaultJourneyId,
  );
  const [kind, setKind] = React.useState<KnowledgeKind>(
    item?.kind ?? "procedimento",
  );
  const titleRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => titleRef.current?.focus(), []);

  const submit = () => {
    const t = title.trim();
    const c = content.trim();
    if (!t) {
      toast.error("Dê um título");
      titleRef.current?.focus();
      return;
    }
    if (!c) {
      toast.error("Escreva o conteúdo");
      return;
    }
    onSave({ title: t, content: c, journeyId, kind });
  };

  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
      <Input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (ex.: Padrão DFT)"
        className="h-10 text-base font-medium"
        maxLength={200}
      />

      <div className="flex flex-wrap gap-2">
        <Select
          value={journeyId ?? GERAL}
          onValueChange={(v) => setJourneyId(v === GERAL ? null : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Jornada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GERAL}>Geral</SelectItem>
            {journeys.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={kind} onValueChange={(v) => setKind(v as KnowledgeKind)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {KNOWLEDGE_KINDS.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={
          "O que alguém precisa saber?\n\nAceita # título, - lista, **negrito**, `código` e links."
        }
        className="min-h-[240px] font-[inherit] leading-relaxed"
        maxLength={20000}
      />

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={!me}>
          Salvar
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
          {me ? "Ctrl+Enter salva" : "Escolha quem você é no topo para escrever"}
        </span>
      </div>
    </div>
  );
}
