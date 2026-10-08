/** Prices are stored as integer millimes (1 TND = 1000 millimes) and exposed in TND with up to 3 decimals. */
export const toMillimes = (tnd: number) => Math.round(tnd * 1000);
export const toTnd = (millimes: number) => millimes / 1000;
