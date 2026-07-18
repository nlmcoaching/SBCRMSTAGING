/** Shared aggregation helpers (integer-cents math). */

import { _c } from "./revenue/money.js";

// Sum a dollar field in integer cents then divide once to avoid accumulation drift.
export const sum = (rows, k) => rows.reduce((a, r) => a + _c(r[k]), 0) / 100;
