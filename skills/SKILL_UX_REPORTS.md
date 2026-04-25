# SKILL_UX_REPORTS — Visualização de Dados

Dashboard, KPIs, charts e exportação para o gestor consultar a operação. Tablet portrait friendly.

## Layout do dashboard

```
+----------------------------------------------------------+
|  [Filtro de data]                       [Mais filtros]   |
+----------------------------------------------------------+
|  KPI 1     |  KPI 2     |  KPI 3     |  KPI 4           |
|  R$ 1.234  |  R$ 25,30  |  48 vendas |  Coxinha (32x)   |
+----------------------------------------------------------+
|                            |                             |
|  Vendas por hora           |   Forma de pagamento        |
|  [BarChart]                |   [DonutChart]              |
|                            |                             |
+----------------------------------------------------------+
|  Últimas 10 vendas                                       |
|  [Table com data, cliente, total, pgto]                  |
+----------------------------------------------------------+
```

## KPI cards

4 cards no topo, responsivos: `grid-cols-2 lg:grid-cols-4 gap-4`.

```tsx
<Card>
  <CardContent className="p-6">
    <p className="text-sm text-muted-foreground">Vendas hoje</p>
    <p className="text-3xl font-bold mt-1">{formatBRL(totalHoje)}</p>
    <p className="text-xs text-success mt-2 flex items-center gap-1">
      <TrendingUp className="h-3 w-3" /> +12% vs ontem
    </p>
  </CardContent>
</Card>
```

KPIs obrigatórios:

| KPI            | Cálculo                                       |
| -------------- | --------------------------------------------- |
| Vendas hoje    | `SUM(total)` das vendas com `status="paid"` no dia |
| Ticket médio   | `vendas_total / qtd_vendas`                   |
| Qtd de vendas  | `COUNT(*)` no período                         |
| Top produto    | Produto mais vendido (nome + qty no período)  |

**Tipografia em KPI:**
- Métrica: `text-3xl font-bold`
- Label: `text-sm text-muted-foreground`
- Variação: `text-xs` colorido (success/destructive) com ícone `TrendingUp/Down`

## Charts (Recharts)

```bash
npm install recharts
```

Sempre dentro de `<ResponsiveContainer>`:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

<Card>
  <CardHeader>
    <CardTitle>Vendas por hora</CardTitle>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={vendasPorHora}>
        <XAxis dataKey="hora" tickFormatter={(h) => `${h}h`} />
        <YAxis tickFormatter={(v) => `R$ ${v}`} />
        <Tooltip
          formatter={(value: number) => formatBRL(value * 100)}
          labelFormatter={(h) => `${h}:00`}
        />
        <Bar dataKey="total" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

**Cores via CSS vars** (definidas em `app/globals.css` — ver `SKILL_DESIGN_SYSTEM.md`):

- `var(--chart-1)` — laranja primário
- `var(--chart-2)` — rosa pink
- `var(--chart-3)` — roxo
- `var(--chart-4)` — verde
- `var(--chart-5)` — azul

Para Donut chart (forma de pagamento):

```tsx
<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie data={porPagamento} dataKey="total" nameKey="metodo" innerRadius={60} outerRadius={100}>
      {porPagamento.map((_, i) => (
        <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
      ))}
    </Pie>
    <Tooltip formatter={(v: number) => formatBRL(v * 100)} />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

## Filtros

### Date range picker

`<Popover>` com calendário (instalar `react-day-picker` se ainda não veio):

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <Calendar className="h-4 w-4 mr-2" />
      {range.from ? `${formatDate(range.from)} — ${formatDate(range.to)}` : "Selecionar período"}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <DayPicker mode="range" selected={range} onSelect={setRange} />
  </PopoverContent>
</Popover>
```

Presets: "Hoje", "Ontem", "Últimos 7 dias", "Esse mês" — botões em row no topo do popover.

### Filtros adicionais

Segundo botão `<Popover>` "Mais filtros" com:
- Cliente (autocomplete via `<Command>`)
- Forma de pagamento (multi-select usando `PAYMENT_METHODS` de `lib/constants.ts`)
- Produto (autocomplete)

Mostrar contador de filtros ativos: `<Badge>3</Badge>` ao lado de "Mais filtros".

## Empty states

Sem dados é uma chance de ser amigável, não de assustar:

```tsx
import { PartyPopper } from "lucide-react";

<Card className="text-center py-16">
  <PartyPopper className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
  <h3 className="text-xl font-semibold mb-2">Ainda não houve vendas hoje</h3>
  <p className="text-muted-foreground mb-6">Bora começar?</p>
  <Button asChild>
    <Link href="/pdv">Ir pro PDV</Link>
  </Button>
</Card>
```

**Regras:**
- Ilustração: ícone lucide grande (`h-16 w-16`) em `text-muted-foreground`
- Tom alegre, não negativo ("Ainda não houve vendas" > "Sem dados")
- Sempre uma CTA (call-to-action) acionável
- Empty states diferentes para "filtros sem resultado" vs "nada cadastrado ainda"

## Lista de últimas vendas

Use `<Table>` shadcn. No mobile, alterna para card list:

```tsx
<div className="hidden md:block">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Data</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead>Forma pgto</TableHead>
        <TableHead className="text-right">Total</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {vendas.map((v) => (
        <TableRow key={v._id}>
          <TableCell>{formatDateTime(v.createdAt)}</TableCell>
          <TableCell>{v.cliente?.nome ?? "—"}</TableCell>
          <TableCell>
            <Badge variant="outline">{PAYMENT_METHOD_LABELS[v.metodoPagamento]}</Badge>
          </TableCell>
          <TableCell className="text-right font-bold text-primary">{formatBRL(v.total)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## Exportação CSV

Snippet para exportar a lista filtrada:

```tsx
function exportarCSV(vendas: Venda[]) {
  const headers = ["Data", "Cliente", "Forma de pagamento", "Total (R$)"];
  const rows = vendas.map((v) => [
    formatDateTime(v.createdAt),
    v.cliente?.nome ?? "",
    PAYMENT_METHOD_LABELS[v.metodoPagamento],
    (v.total / 100).toFixed(2).replace(".", ","),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }); // BOM para Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Notas:**
- Separador `;` (Excel pt-BR usa ponto-e-vírgula)
- BOM `\uFEFF` no início — sem isso, Excel quebra acentos
- Vírgula como separador decimal nos valores
- Nome do arquivo com data ISO

## Referências cruzadas

- `lib/format.ts` — `formatBRL`, `formatDate`, `formatDateTime`
- `lib/constants.ts` — `PAYMENT_METHODS`, `PAYMENT_METHOD_LABELS`
- `app/globals.css` — `--chart-1` ... `--chart-5`
- `SKILL_DESIGN_SYSTEM.md` — paleta completa e tipografia
- `SKILL_UX_FEEDBACK.md` — toasts ao exportar CSV
