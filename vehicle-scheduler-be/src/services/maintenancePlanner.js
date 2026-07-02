'use strict';

const { extractArrayPayload, fetchDepots, fetchVehicles } = require('../lib/upstream');
const { solveKnapsack } = require('../lib/knapsack');
const { createAppError } = require('../lib/http');

class MaintenancePlanner {
  constructor({ depotsUrl, vehiclesUrl, token, logger, timeoutMs = 8000 }) {
    this.depotsUrl = depotsUrl;
    this.vehiclesUrl = vehiclesUrl;
    this.token = token;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
  }

  safeLog(level, pkg, message) {
    try {
      void this.logger[level](pkg, message, 'backend').catch(() => {});
    } catch {
      // Logging must never break the planner.
    }
  }

  async loadInputs() {
    this.safeLog('info', 'service', 'loading depots and vehicles from upstream APIs');
    const [depotsPayload, vehiclesPayload] = await Promise.all([
      fetchDepots(this.depotsUrl, this.token, this.timeoutMs),
      fetchVehicles(this.vehiclesUrl, this.token, this.timeoutMs),
    ]);

    const depots = extractArrayPayload(depotsPayload, ['depots']);
    const vehicles = extractArrayPayload(vehiclesPayload, ['vehicles', 'tasks']);

    if (!depots.length) {
      throw createAppError(502, 'Depot feed did not return any depots');
    }

    if (!vehicles.length) {
      throw createAppError(502, 'Vehicle feed did not return any vehicles');
    }

    this.safeLog('info', 'service', `loaded depots=${depots.length} vehicles=${vehicles.length}`);
    return { depots, vehicles };
  }

  normalizeDepot(depot) {
    const depotId = depot.ID ?? depot.id ?? depot.depotId ?? depot.DepotID;
    const mechanicHours = Number(depot.MechanicHours ?? depot.mechanicHours ?? depot.hours ?? depot.availableHours ?? 0);

    return {
      depotId: depotId !== undefined && depotId !== null ? depotId : null,
      mechanicHours: Math.max(0, Math.floor(mechanicHours)),
      raw: depot,
    };
  }

  buildPlanForDepot(depot, vehicles) {
    const normalizedDepot = this.normalizeDepot(depot);
    const result = solveKnapsack(vehicles, normalizedDepot.mechanicHours);

    return {
      depotId: normalizedDepot.depotId,
      mechanicHours: normalizedDepot.mechanicHours,
      totalDuration: result.totalDuration,
      totalImpact: result.totalImpact,
      utilizationPercent: normalizedDepot.mechanicHours
        ? Number(((result.totalDuration / normalizedDepot.mechanicHours) * 100).toFixed(2))
        : 0,
      selectedVehicles: result.selected.map((task, index) => ({
        taskId: task.id,
        duration: task.duration,
        impact: task.impact,
        rank: index + 1,
      })),
    };
  }

  async buildMaintenancePlan(limit = 10) {
    const finalLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const { depots, vehicles } = await this.loadInputs();
    const plans = depots.map((depot) => this.buildPlanForDepot(depot, vehicles));

    plans.sort((a, b) => {
      if (b.totalImpact !== a.totalImpact) return b.totalImpact - a.totalImpact;
      if (b.totalDuration !== a.totalDuration) return b.totalDuration - a.totalDuration;
      return String(a.depotId).localeCompare(String(b.depotId));
    });

    const sliced = plans.slice(0, finalLimit);
    this.safeLog('info', 'service', `built maintenance plans count=${sliced.length}`);

    return {
      limit: finalLimit,
      depotCount: depots.length,
      vehicleCount: vehicles.length,
      plans: sliced,
    };
  }
}

module.exports = {
  MaintenancePlanner,
};
