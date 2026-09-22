import React from 'react';
import { Mail, Search } from 'lucide-react';

import { formatCOP } from '../../lib/format';
import { Client } from '../../store/almacenAplicacion';

interface ClientsSectionProps {
  filteredClients: Client[];
  customerSearch: string;
  setCustomerSearch: React.Dispatch<React.SetStateAction<string>>;
  setSelectedClientInfo: React.Dispatch<React.SetStateAction<Client | null>>;
}

export default function ClientsSection({
  filteredClients,
  customerSearch,
  setCustomerSearch,
  setSelectedClientInfo,
}: ClientsSectionProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Directorio de Clientes</h2>
        <p className="text-gray-500 dark:text-stone-400 mt-1">Base de datos de tus clientes registrados.</p>
      </div>

      <div className="bg-white dark:bg-[#151515] rounded-[24px] border border-gray-100 dark:border-stone-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 min-w-0">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar cliente por nombre o teléfono..." 
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#1A1A1A] border-none rounded-2xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-orange dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-[#1A1A1A]/50 border-b border-gray-100 dark:border-stone-800 text-xs font-black text-gray-500 dark:text-stone-400 uppercase tracking-wider">
                <th className="p-6">Nombre</th>
                <th className="p-6">Teléfono</th>
                <th className="p-6">Email</th>
                <th className="p-6 text-center">Pedidos</th>
                <th className="p-6 text-right">Total Gastado</th>
                <th className="p-6 text-center">Último Pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
              {filteredClients.length > 0 ? filteredClients.map((client) => (
                <tr key={client.id} onClick={() => setSelectedClientInfo(client)} className="hover:bg-gray-50/50 dark:hover:bg-[#1A1A1A]/50 transition-colors group cursor-pointer">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-lg">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">{client.name}</span>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-medium text-gray-600 dark:text-stone-400">{client.phone}</td>
                  <td className="p-6 text-sm text-gray-500 dark:text-stone-500">{client.email || '-'}</td>
                  <td className="p-6 text-center">
                    <span className="inline-flex items-center justify-center bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-stone-300 px-3 py-1 rounded-full text-xs font-bold">
                      {client.ordersCount || 0}
                    </span>
                  </td>
                  <td className="p-6 text-right font-black text-gray-900 dark:text-white">
                    {formatCOP(client.totalSpent || 0)}
                  </td>
                  <td className="p-6 text-center text-sm font-medium text-gray-500 dark:text-stone-400">
                    {client.lastOrderDate ? new Date(client.lastOrderDate).toLocaleDateString() : '-'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-stone-400">
                    No hay clientes registrados en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Mobile Cards for Clients */}
        <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 border-t border-gray-100 dark:border-stone-800">
          {filteredClients.length > 0 ? filteredClients.map((client) => (
            <div key={client.id} onClick={() => setSelectedClientInfo(client)} className="bg-gray-50/50 dark:bg-[#1A1A1A]/50 border border-gray-100 dark:border-stone-800 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:border-brand-orange/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-brand-orange/10 flex items-center justify-center text-brand-orange font-bold text-xl shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-[clamp(14px,4vw,16px)] line-clamp-2 leading-tight break-words">{client.name}</h4>
                  <p className="text-[clamp(11px,3.5vw,14px)] font-medium text-gray-600 dark:text-stone-400 break-words">{client.phone}</p>
                </div>
              </div>
              {client.email && (
                <p className="text-[clamp(11px,3.5vw,14px)] text-gray-500 dark:text-stone-500 flex items-center gap-2 min-w-0">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" /> <span className="truncate">{client.email}</span>
                </p>
              )}
              <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-gray-200/50 dark:border-stone-800">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Pedidos</p>
                  <p className="font-black text-gray-900 dark:text-white text-lg">{client.ordersCount || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Total</p>
                  <p className="font-black text-brand-orange text-[clamp(16px,4vw,18px)] leading-none">{formatCOP(client.totalSpent || 0)}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-2 text-center text-gray-500 font-medium py-8">No se encontraron clientes.</div>
          )}
        </div>
      </div>
    </div>
  );
}
