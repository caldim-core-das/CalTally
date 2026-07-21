class ReportEngine {
  /**
   * Compiles and builds a standardized report response by executing definition repositories.
   */
  static async buildReport(definition, filters) {
    if (!definition) {
      throw new Error('Report definition is required.');
    }

    const { companyId, fromDate, toDate } = filters;
    if (!companyId || !fromDate || !toDate) {
      throw new Error('companyId, fromDate, and toDate are mandatory report parameters.');
    }

    // Support definition-level custom build sequences (e.g. cross-repository mapping)
    if (definition.customBuild && typeof definition.customBuild === 'function') {
      return await definition.customBuild(filters);
    }

    // 1. Fetch raw datasets from repository layer mapped in definition
    const rawData = definition.repository.getSalesForPeriod ?
      await definition.repository.getSalesForPeriod({ companyId, fromDate, toDate }) :
      await definition.repository.getPurchasesForPeriod({ companyId, fromDate, toDate });

    // 2. Map row filters
    let processedRows = rawData.map(row => definition.formatter(row));

    // Apply definition-specific custom filter callbacks if defined
    if (definition.filterCallback && typeof definition.filterCallback === 'function') {
      processedRows = definition.filterCallback(processedRows, filters);
    }

    // 3. Compile summary metrics (KPIs)
    const kpis = definition.compileKPIs ? definition.compileKPIs(processedRows) : {};

    // 4. Return standard envelope payload
    return {
      metadata: {
        reportName: definition.name,
        companyId,
        fromDate,
        toDate,
        generatedAt: new Date().toISOString(),
        columns: definition.columns
      },
      kpis,
      rows: processedRows
    };
  }
}

module.exports = ReportEngine;
