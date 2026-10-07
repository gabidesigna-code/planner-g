export type Context = "trabalho" | "pessoal";
export type ContextFilter = "tudo" | Context;
export type Kind = "tarefa" | "compromisso" | "lembrete" | "evento";
export type Status = "a-fazer" | "em-andamento" | "aguardando" | "pronto" | "concluido";
export type Priority = "urgente" | "alta" | "normal" | "baixa";
export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

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
  /** Último dia de um evento que dura vários dias (o início é `due`) */
  endDate?: Date;
  location?: string;
  /** Cliente / empresa (só Trabalho) */
  client?: string;
  priority: Priority;
  status: Status;
  note?: string;
  /** Quem está sendo aguardado: cliente, banco, prefeitura, Receita, convênio… */
  waitingOn?: string;
  recurrence?: Recurrence;
  subtasks?: Subtask[];
  doneAt?: Date;
  /** Ordem na lista (menor = mais acima). Persistida no banco. */
  position?: number;
}

/** Categoria do usuário (as padrão são criadas no cadastro). */
export interface Category {
  id: string;
  name: string;
  context: Context;
  color?: string;
  icon?: string;
}

/** Item sem categoria própria: aparece como "Outros" na interface. */
export const NO_CATEGORY = "Outros";

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

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "Não repete",
  daily: "Todo dia",
  weekly: "Toda semana",
  monthly: "Todo mês",
  yearly: "Todo ano",
};
