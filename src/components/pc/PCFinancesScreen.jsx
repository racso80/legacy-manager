import PCFinancesReserveBox from "./finances/PCFinancesReserveBox.jsx";
import PCFinancesFanAndWages from "./finances/PCFinancesFanAndWages.jsx";
import PCFinancesIncomeBox from "./finances/PCFinancesIncomeBox.jsx";
import PCFinancesTopEarners from "./finances/PCFinancesTopEarners.jsx";
import PCFinancesSummary from "./finances/PCFinancesSummary.jsx";

const fmt = v => v >= 1000 ? `€${(v / 1000).toFixed(1)}M` : `€${v}K`;

export default function PCFinancesScreen({ game, team, budgetSnapshot }) {
  const players = game.players;
  const matchday = game.matchday;
  const weeklyWages = players.reduce((s, p) => s + (p.salary ?? 0), 0);
  const monthlyWages = weeklyWages * 4;
  const seasonWages = weeklyWages * 38;
  const matchdaysPlayed = Math.max(0, matchday - 1);
  const totalWageSpent = matchdaysPlayed * weeklyWages;

  // Mismo cálculo que la corrección ya aplicada en el móvil (App.jsx, FinancesScreen):
  // derivado de game.transfers filtrado por season, sin acumulador propio.
  const seasonTransferSpend = (game.transfers ?? [])
    .filter(t => String(t.season) === String(game.season) && ["buy", "loanIn"].includes(t.type))
    .reduce((s, t) => s + (t.cost ?? 0), 0);
  const totalExpenses = totalWageSpent + seasonTransferSpend;

  const incomeLog = game.incomeLog ?? [];
  const totalGate = incomeLog.reduce((s, e) => s + (e.gateRevenue ?? 0), 0);
  const totalMembers = incomeLog.reduce((s, e) => s + (e.memberIncomePerHomeMatch ?? 0), 0);
  const totalShop = incomeLog.reduce((s, e) => s + (e.shopIncome ?? 0), 0);
  const totalAds = incomeLog.reduce((s, e) => s + (e.adIncome ?? 0), 0);
  const totalIncome = totalGate + totalMembers + totalShop + totalAds;
  const homeMatchesPlayed = incomeLog.filter(e => e.isHome).length;

  const balance = totalIncome - totalExpenses;
  const budgetK = (team?.budget ?? 50) * 1000;
  const budgetLeft = budgetSnapshot.clubCash;
  const budgetPct = Math.max(0, Math.min(100, Math.round((budgetSnapshot.transferBudget / Math.max(1, budgetLeft)) * 100)));
  const budgetColor = budgetPct >= 60 ? "var(--fn-green, #22c55e)" : budgetPct >= 30 ? "var(--fn-orange, #f59e0b)" : "var(--fn-red, #ef4444)";

  const fanLove = game.fanLove ?? 70;

  return (
    <div className="pc-fn-root">
      <div className="pc-fn-header"><h1>Finanzas</h1></div>

      {game.seasonOpeningStatement && (
        <div className="pc-fn-season-card">
          <div className="pc-fn-season-title">Cierre y apertura de temporada</div>
          {[
            ["Saldo de cierre", game.seasonOpeningStatement.closingBalance],
            ["Derechos TV", game.seasonOpeningStatement.tvRights],
            ["Patrocinios", game.seasonOpeningStatement.sponsorship],
            ["Socios", game.seasonOpeningStatement.members],
            ["Premio clasificación", game.seasonOpeningStatement.positionPrize],
            ["Gastos operativos", -game.seasonOpeningStatement.operatingCosts],
          ].map(([label, value]) => (
            <div key={label} className="pc-fn-season-row">
              <span>{label}</span>
              <strong style={{ color: value >= 0 ? "var(--fn-green, #22c55e)" : "var(--fn-red, #ef4444)" }}>{value >= 0 ? "+" : "-"}{fmt(Math.abs(value))}</strong>
            </div>
          ))}
          <div className="pc-fn-season-total">
            <span>Presupuesto inicial</span>
            <strong>{fmt(game.seasonOpeningStatement.openingBalance)}</strong>
          </div>
        </div>
      )}

      <div className="pc-fn-balance-row">
        <div className="pc-fn-balance-card">
          <div className="pc-fn-balance-label">Ingresos</div>
          <div className="pc-fn-balance-value" style={{ color: "var(--fn-green, #22c55e)" }}>{fmt(totalIncome)}</div>
          <div className="pc-fn-balance-sub">{incomeLog.length} jornadas con datos</div>
        </div>
        <div className="pc-fn-balance-card">
          <div className="pc-fn-balance-label">Gastos</div>
          <div className="pc-fn-balance-value" style={{ color: "var(--fn-red, #ef4444)" }}>{fmt(totalExpenses)}</div>
          <div className="pc-fn-balance-sub">Salarios {fmt(totalWageSpent)} + fichajes {fmt(seasonTransferSpend)}</div>
        </div>
        <div className="pc-fn-balance-card">
          <div className="pc-fn-balance-label">Balance neto</div>
          <div className="pc-fn-balance-value" style={{ color: balance >= 0 ? "var(--fn-green, #22c55e)" : "var(--fn-red, #ef4444)" }}>{balance >= 0 ? "+" : ""}{fmt(balance)}</div>
        </div>
        <div className="pc-fn-balance-card">
          <div className="pc-fn-balance-label">Caja del club</div>
          <div className="pc-fn-balance-value" style={{ color: budgetColor }}>{fmt(budgetLeft)}</div>
          <div className="pc-fn-balance-sub">de {fmt(budgetK)} inicial</div>
        </div>
      </div>

      <div className="pc-fn-layout">
        <PCFinancesReserveBox budgetSnapshot={budgetSnapshot} budgetPct={budgetPct} budgetColor={budgetColor} />
        <PCFinancesFanAndWages fanLove={fanLove} weeklyWages={weeklyWages} monthlyWages={monthlyWages} seasonWages={seasonWages} />
      </div>

      <PCFinancesIncomeBox
        totalGate={totalGate} totalMembers={totalMembers} totalShop={totalShop} totalAds={totalAds}
        totalIncome={totalIncome} homeMatchesPlayed={homeMatchesPlayed} clubPrestige={game.legacy?.clubPrestige ?? 30}
      />

      <div className="pc-fn-layout">
        <PCFinancesTopEarners players={players} />
        <PCFinancesSummary matchdaysPlayed={matchdaysPlayed} players={players} budgetK={budgetK} weeklyWages={weeklyWages} />
      </div>
    </div>
  );
}
