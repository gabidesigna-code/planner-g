import { addDays, startOfDay } from "./dates";
import type { Task } from "./types";

type Seed = Partial<Task> & Pick<Task, "id" | "title" | "context" | "category">;
const it = (o: Seed): Task => ({ due: startOfDay(), kind: "tarefa", priority: "normal", status: "a-fazer", ...o });

/** Dados fictícios: datas relativas a hoje para a agenda sempre parecer "viva". */
export function seedTasks(): Task[] {
  const t = startOfDay();
  const d = (n: number) => addDays(t, n);
  const sub = (id: string, title: string, done = false) => ({ id, title, done });
  const past = (n: number) => ({ status: "concluido" as const, due: d(n), doneAt: d(n) });

  return [
    // ── Hoje, com horário
    it({ id: "m1", title: "Reunião com cliente", context: "trabalho", kind: "compromisso", category: "Reuniões", client: "Sisemo", due: d(0), time: "09:00", end: "10:00", priority: "alta", note: "Pauta: retenções de ISS e prazo do SPED." }),
    it({ id: "m2", title: "Resolver nota PSG Split", context: "trabalho", category: "Fiscal", topic: "Prefeitura", client: "PSG", due: d(0), time: "10:30", end: "11:30", priority: "urgente", status: "em-andamento", note: "Protocolo aberto. Levar o número do processo." }),
    it({ id: "m3", title: "Almoço", context: "pessoal", kind: "evento", category: "Outros", due: d(0), time: "12:00", end: "12:30" }),
    it({ id: "m4", title: "Consulta", context: "pessoal", kind: "compromisso", category: "Saúde", due: d(0), time: "12:30", end: "13:30", priority: "alta" }),
    it({ id: "m5", title: "Conciliar extrato FCA", context: "trabalho", category: "Financeiro", topic: "Conciliação", client: "FCA", due: d(0), time: "14:00", end: "15:30", priority: "alta" }),
    it({ id: "m6", title: "Dentista", context: "pessoal", kind: "compromisso", category: "Saúde", due: d(0), time: "16:00", end: "17:00" }),
    it({ id: "m7", title: "Mercado", context: "pessoal", category: "Compras", due: d(0), time: "18:30", note: "Frutas, café, papel toalha." }),

    // ── Hoje, sem horário
    it({ id: "u1", title: "Enviar ISS Transmartins", context: "trabalho", category: "Fiscal", topic: "ISS", client: "Transmartins", due: d(0), priority: "alta" }),
    it({ id: "u2", title: "Enviar ISS Sisemo", context: "trabalho", category: "Fiscal", topic: "ISS", client: "Sisemo", due: d(0), priority: "alta", note: "Mandar junto o comprovante de retenção." }),
    it({
      id: "u3", title: "Fechamento financeiro", context: "trabalho", category: "Financeiro", client: "FCA", due: d(0),
      status: "em-andamento", recurring: true, priority: "alta",
      subtasks: [
        sub("s1", "Enviar cobrança dos reembolsos", true),
        sub("s2", "Enviar cobrança das notas da Juliana Curi", true),
        sub("s3", "Conciliar o extrato"),
        sub("s4", "Programar pagamentos"),
        sub("s5", "Calcular distribuição de lucros"),
      ],
    }),
    it({ id: "u4", title: "Comprar ração", context: "pessoal", category: "Casa", due: d(0) }),
    it({ id: "u5", title: "Responder mensagens", context: "pessoal", category: "Outros", due: d(0), priority: "baixa" }),

    // ── Concluídas hoje
    { ...it({ id: "c1", title: "Enviar ISS Vitalis", context: "trabalho", category: "Fiscal", topic: "ISS", client: "Vitalis", due: d(0), priority: "alta" }), status: "concluido", doneAt: new Date() },
    { ...it({ id: "c2", title: "Pagar fatura do cartão", context: "pessoal", category: "Financeiro pessoal", due: d(0) }), status: "concluido", doneAt: new Date() },

    // ── Atrasadas
    it({ id: "o1", title: "Conferir clientes que normalmente não têm ISS", context: "trabalho", category: "Fiscal", topic: "Conferências", due: d(-1), priority: "alta", status: "em-andamento" }),
    it({ id: "o2", title: "Retificar EFD Contribuições", context: "trabalho", category: "Fiscal", topic: "Retificações", client: "Transmartins", due: d(-3), priority: "urgente", note: "Divergência de crédito de PIS/COFINS apontada na conferência." }),
    it({ id: "o3", title: "Pagar conta de luz", context: "pessoal", category: "Financeiro pessoal", due: d(-1), priority: "alta" }),

    // ── Aguardando
    it({ id: "w1", title: "Confirmar extrato para conciliação", context: "trabalho", category: "Financeiro", client: "Sisemo", due: d(1), status: "aguardando", waitingOn: "Banco" }),
    it({ id: "w2", title: "Receber XMLs de entrada do mês", context: "trabalho", category: "Fiscal", topic: "Conferências", client: "Vitalis", due: d(2), status: "aguardando", waitingOn: "Cliente" }),
    it({ id: "w3", title: "Reembolso do plano de saúde", context: "pessoal", category: "Saúde", due: d(3), status: "aguardando", waitingOn: "Convênio" }),

    // ── Próximos dias
    it({ id: "n1", title: "Jantar com a família", context: "pessoal", kind: "evento", category: "Família", due: d(1), time: "20:00" }),
    it({ id: "n2", title: "Planejar a semana", context: "trabalho", kind: "lembrete", category: "Administrativo", due: d(2), time: "19:00", recurring: true }),
    it({ id: "n3", title: "Conferir recibos da DCTFWeb", context: "trabalho", category: "Fiscal", topic: "DCTFWeb", due: d(2), recurring: true }),
    it({ id: "n4", title: "Reunião de alinhamento PSG", context: "trabalho", kind: "compromisso", category: "Reuniões", client: "PSG", due: d(3), time: "09:30", end: "10:30" }),
    it({ id: "n5", title: "Academia", context: "pessoal", kind: "compromisso", category: "Lazer", due: d(3), time: "19:00", recurring: true }),
    it({
      id: "n6", title: "Entregar SPED Fiscal", context: "trabalho", category: "Fiscal", topic: "SPED Fiscal", client: "Transmartins", due: d(4),
      priority: "alta", recurring: true,
      subtasks: [sub("a", "Validar no PVA", true), sub("b", "Transmitir"), sub("c", "Arquivar recibo")],
    }),
    it({ id: "n7", title: "Boleto do condomínio", context: "pessoal", category: "Casa", due: d(5), priority: "alta" }),
    it({ id: "n8", title: "Gerar guias do Simples Nacional", context: "trabalho", category: "Fiscal", topic: "Simples Nacional", due: d(5), recurring: true }),
    it({ id: "n9", title: "Emitir faturamento mensal", context: "trabalho", category: "Financeiro", topic: "Faturamento", client: "PSG", due: d(6), recurring: true }),
    it({ id: "n10", title: "Cinema com amigas", context: "pessoal", kind: "evento", category: "Lazer", due: d(6), time: "15:00" }),
    it({ id: "n11", title: "Retorno do ortodontista", context: "pessoal", kind: "compromisso", category: "Saúde", due: d(10), time: "11:00" }),
    it({ id: "n12", title: "Reunião mensal de resultados", context: "trabalho", kind: "compromisso", category: "Reuniões", due: d(13), time: "10:00", end: "11:00" }),

    // ── Passado (concluído)
    { ...it({ id: "p1", title: "Reunião de alinhamento FCA", context: "trabalho", kind: "compromisso", category: "Reuniões", client: "FCA", time: "09:00", end: "10:00" }), ...past(-1) },
    { ...it({ id: "p2", title: "Enviar DAS Sisemo", context: "trabalho", category: "Fiscal", topic: "Simples Nacional", client: "Sisemo" }), ...past(-2) },
    { ...it({ id: "p3", title: "Pilates", context: "pessoal", kind: "compromisso", category: "Lazer", time: "19:00" }), ...past(-2) },
    { ...it({ id: "p4", title: "Pagar IPTU", context: "pessoal", category: "Casa" }), ...past(-3) },
  ];
}
