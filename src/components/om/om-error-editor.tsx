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
import { OM_ERROR_STATUSES } from "@/lib/types";
import type { Journey, OmError, OmErrorStatus } from "@/db/schema";

const SEM_JORNADA = "__sem__";

export type OmErrorValues = {
  symptom: string;
  workaround: string | null;
  detail: string | null;
  journeyId: string | null;
  status: OmErrorStatus;
  handledBy: string | null;
  fixedAt: string | null;
};

export function OmErrorEditor({
  error,
  journeys,
  handlers,
  onCancel,
  onSave,
}: {
  error: OmError;
  journeys: Journey[];
  /** Nomes já usados em "quem trata", para sugerir enquanto digita. */
  handlers: string[];
  onCancel: () => void;
  onSave: (values: OmErrorValues) => void;
}) {
  const { me, team } = useTeam();
  const [symptom, setSymptom] = React.useState(error.symptom);
  const [workaround, setWorkaround] = React.useState(error.workaround ?? "");
  const [detail, setDetail] = React.useState(error.detail ?? "");
  const [journeyId, setJourneyId] = React.useState(error.journeyId);
  const [status, setStatus] = React.useState<OmErrorStatus>(error.status);
  const [handledBy, setHandledBy] = React.useState(error.handledBy ?? "");
  const [fixedAt, setFixedAt] = React.useState(error.fixedAt ?? "");
  const symptomRef = React.useRef<HTMLInputElement>(null);

  // Marcar como corrigido já propõe hoje, como faz a trilha de status.
  React.useEffect(() => {
    if (status === "corrigido" && !fixedAt) {
      setFixedAt(new Date().toISOString().slice(0, 10));
    }
  }, [status, fixedAt]);

  const sugestoes = React.useMemo(() => {
    const nomes = new Set([...team.map((m) => m.name), ...handlers]);
    return [...nomes];
  }, [team, handlers]);

  const submit = () => {
    const s = symptom.trim();
    if (!s) {
      toast.error("Descreva o erro");
      symptomRef.current?.focus();
      return;
    }
    onSave({
      symptom: s,
      workaround: workaround.trim() || null,
      detail: detail.trim() || null,
      journeyId,
      status,
      handledBy: handledBy.trim() || null,
      fixedAt: status === "corrigido" ? fixedAt || null : null,
    });
  };

  return (
    <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-5">
      <Input
        ref={symptomRef}
        value={symptom}
        onChange={(e) => setSymptom(e.target.value)}
        placeholder="Como o erro aparece"
        className="h-10 text-base font-medium"
        maxLength={300}
      />

      <div className="flex flex-wrap gap-2">
        <Select
          value={journeyId ?? SEM_JORNADA}
          onValueChange={(v) => setJourneyId(v === SEM_JORNADA ? null : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Jornada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_JORNADA}>Sem jornada</SelectItem>
            {journeys.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => setStatus(v as OmErrorStatus)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {OM_ERROR_STATUSES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex min-w-[170px] flex-1 flex-col gap-1">
          <Input
            value={handledBy}
            onChange={(e) => setHandledBy(e.target.value)}
            placeholder="Quem trata (equipe ou externo)"
            list="om-handlers"
            maxLength={80}
          />
          <datalist id="om-handlers">
            {sugestoes.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>
        </div>

        {status === "corrigido" && (
          <label className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            Corrigido em
            <Input
              type="date"
              value={fixedAt}
              onChange={(e) => setFixedAt(e.target.value)}
              className="w-[150px]"
              aria-label="Data da correção"
            />
          </label>
        )}
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
          Contorno — o que fazer enquanto não corrige
        </label>
        <Textarea
          value={workaround}
          onChange={(e) => setWorkaround(e.target.value)}
          placeholder="Ex.: reprocessar pelo script X e confirmar no OM"
          className="min-h-[90px]"
          maxLength={4000}
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-[var(--color-muted-foreground)]">
          Causa e contexto
        </label>
        <Textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Quando acontece, o que já se investigou. Aceita # título, - lista, `código` e links."
          className="min-h-[140px]"
          maxLength={20000}
        />
      </div>

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
