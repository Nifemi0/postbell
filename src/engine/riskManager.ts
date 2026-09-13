import { RiskPositionResult, SimulatedOrder } from "./types";

export function calculateRiskPosition(
  symbol: string,
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLossPrice: number,
  takeProfitTarget?: number
): RiskPositionResult {
  if (entryPrice <= 0 || stopLossPrice <= 0 || accountBalance <= 0) {
    throw new Error("Prices and account balance must be strictly positive");
  }

  const stopLossDistance = Math.abs(entryPrice - stopLossPrice);
  const stopLossDistancePct = Number(((stopLossDistance / entryPrice) * 100).toFixed(2));

  // Capital willing to risk
  const riskCapitalUsd = Number(((accountBalance * (riskPercentage / 100))).toFixed(2));

  // Position sizing: Risk / Distance per unit
  const rawUnits = riskCapitalUsd / stopLossDistance;
  const positionUnits = Number(rawUnits.toFixed(symbol.includes("DOGE") ? 1 : 4));
  const positionSizeUsd = Number((positionUnits * entryPrice).toFixed(2));

  // Take profit targets (1:2 and 1:3 RR)
  const isLong = entryPrice > stopLossPrice;
  const tp1 = isLong ? entryPrice + stopLossDistance * 2.0 : entryPrice - stopLossDistance * 2.0;
  const tp2 = takeProfitTarget || (isLong ? entryPrice + stopLossDistance * 3.0 : entryPrice - stopLossDistance * 3.0);

  const riskRewardRatio1 = 2.0;
  const targetDistance = Math.abs(tp2 - entryPrice);
  const riskRewardRatio2 = Number((targetDistance / stopLossDistance).toFixed(2));

  const maxLossUsd = riskCapitalUsd;
  const potentialProfitUsd = Number((positionUnits * targetDistance).toFixed(2));

  const isTradeApproved = riskRewardRatio2 >= 1.5 && stopLossDistancePct <= 8.0;
  let recommendationNote = `Position approved. Sizing: ${positionUnits} units (\$${positionSizeUsd} USD) risking \$${maxLossUsd} (${riskPercentage}%) for potential gain of \$${potentialProfitUsd} (RR 1:${riskRewardRatio2}).`;

  if (!isTradeApproved) {
    if (riskRewardRatio2 < 1.5) {
      recommendationNote = `Trade Warning: Risk-to-reward ratio 1:${riskRewardRatio2} is below the 1:1.5 threshold. Recommended to widen target or tighten invalidation level.`;
    } else {
      recommendationNote = `Trade Warning: Stop-loss distance of ${stopLossDistancePct}% exceeds maximum 8% threshold for conservative leverage.`;
    }
  }

  return {
    symbol,
    accountBalance,
    riskPercentage,
    riskCapitalUsd,
    entryPrice,
    stopLossPrice,
    stopLossDistancePct,
    positionUnits,
    positionSizeUsd,
    suggestedTp1: Number(tp1.toFixed(2)),
    suggestedTp2: Number(tp2.toFixed(2)),
    riskRewardRatio1,
    riskRewardRatio2,
    maxLossUsd,
    potentialProfitUsd,
    isTradeApproved,
    recommendationNote
  };
}

export function executeSimulatedOrder(
  symbol: string,
  side: "BUY" | "SELL",
  units: number,
  marketPrice: number,
  orderType: "MARKET" | "LIMIT" = "MARKET",
  stopLoss?: number,
  takeProfit?: number
): SimulatedOrder {
  // Realistic slippage: 0.02% to 0.05%
  const slippageFactor = 1 + (side === "BUY" ? 1 : -1) * (0.0002 + Math.random() * 0.0003);
  const executionPrice = Number((marketPrice * slippageFactor).toFixed(symbol.includes("DOGE") ? 5 : 2));
  const slippagePct = Number((Math.abs((executionPrice - marketPrice) / marketPrice) * 100).toFixed(3));

  const totalValueUsd = Number((units * executionPrice).toFixed(2));
  const tradingFeeUsd = Number((totalValueUsd * 0.0006).toFixed(2)); // Bitget VIP 0 taker fee 0.06%

  return {
    orderId: `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    symbol,
    side,
    orderType,
    units,
    requestedPrice: marketPrice,
    executionPrice,
    slippagePct,
    tradingFeeUsd,
    totalValueUsd,
    stopLoss,
    takeProfit,
    status: "FILLED"
  };
}
