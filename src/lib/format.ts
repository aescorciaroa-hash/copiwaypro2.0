export const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Staff.vehicle guarda el valor crudo del ENUM de la BD ('moto','bicicleta',
// 'carro','a_pie') en minuscula -- el selector ya lo muestra bonito
// ("Moto") pero varias vistas (tarjeta del repartidor, lista de la flota)
// lo imprimian directo sin pasar por esta traduccion.
const VEHICLE_LABELS: Record<string, string> = {
  moto: 'Moto',
  bicicleta: 'Bicicleta',
  carro: 'Carro',
  a_pie: 'A pie',
};

export const vehicleLabel = (vehicle?: string | null): string => {
  if (!vehicle) return '';
  return VEHICLE_LABELS[vehicle] ?? (vehicle.charAt(0).toUpperCase() + vehicle.slice(1));
};

/** "Moto - GIXXER 155 FI" si hay modelo, si no solo "Moto". */
export const vehicleWithModel = (vehicle?: string | null, model?: string | null): string => {
  const label = vehicleLabel(vehicle);
  const modeloLimpio = (model || '').trim();
  if (!label) return modeloLimpio;
  return modeloLimpio ? `${label} - ${modeloLimpio}` : label;
};
