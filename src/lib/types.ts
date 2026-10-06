export type Context = "trabalho" | "pessoal";
export type ContextFilter = "tudo" | Context;
export type Kind = "tarefa" | "compromisso" | "lembrete" | "evento";
export type Status = "a-fazer" | "em-andamento" | "aguardando" | "pronto" | "concluido";
export type Priority = "urgente" | "alta" | "normal" | "baixa";

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

/** Qualquer coisa da agenda: tarefa, compromisso, lembrete ou evento. */
export interface Task {
  id: string;
  title: string;
  context: Context;
  kind: Kind;
  category: string;
  /** Detalhe opcional da categoria, ex.: "ISS" dentro de Fiscal */
  topic?: string;
  /** Dia (início do dia, horário local) */
  due: Date;
  /** "HH:MM". Sem valor = sem horário. */
  time?: string;
  end?: string;
  /** Cliente / empresa (só Trabalho) */
  client?: string;
  priority: Priority;
  status: Status;
  note?: string;
  /** Quem está sendo aguardado: cliente, banco, prefeitura, Receita, convênio… */
  waitingOn?: string;
  recurring?: boolean;
  subtasks?: Subtask[];
  doneAt?: Date;
}

export const STATUS_LABEL: Record<Status, string> = {
  "a-fazer": "A fazer",
  "em-andamento": "Em andamento",
  aguardando: "Aguardando",
  pronto: "Pronto para finalizar",
  concluido: "Concluído",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  normal: "Normal",
  baixa: "Baixa",
};

export const KIND_LABEL: Record<Kind, string> = {
  tarefa: "Tarefa",
  compromisso: "Compromisso",
  lembrete: "Lembrete",
  evento: "Evento",
};

export const CATEGORIES: Record<Context, string[]> = {
  trabalho: ["Fiscal", "Financeiro", "Reuniões", "Clientes", "Administrativo", "Outros"],
  pessoal: ["Casa", "Compras", "Saúde", "Família", "Compromissos", "Financeiro pessoal", "Lazer", "Outros"],
};
