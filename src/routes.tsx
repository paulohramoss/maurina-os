import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RotaProtegida } from '@/features/auth/RotaProtegida'
import { TelaLogin } from '@/features/auth/TelaLogin'
import { TelaDashboard } from '@/features/dashboard/TelaDashboard'
import { TelaListaOS } from '@/features/ordens/TelaListaOS'
import { TelaNovaOS } from '@/features/ordens/TelaNovaOS'
import { TelaDetalheOS } from '@/features/ordens/TelaDetalheOS'
import { TelaClientes } from '@/features/clientes/TelaClientes'
import { TelaFichaCliente } from '@/features/clientes/TelaFichaCliente'
import { TelaEquipe } from '@/features/equipe/TelaEquipe'

export const router = createBrowserRouter([
  { path: '/login', element: <TelaLogin /> },
  {
    path: '/',
    element: (
      <RotaProtegida>
        <AppShell />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <TelaDashboard /> },
      { path: 'os', element: <TelaListaOS /> },
      {
        path: 'os/nova',
        element: (
          <RotaProtegida exige="os:criar">
            <TelaNovaOS />
          </RotaProtegida>
        ),
      },
      { path: 'os/:id', element: <TelaDetalheOS /> },
      {
        path: 'clientes',
        element: (
          <RotaProtegida exige="cliente:criar">
            <TelaClientes />
          </RotaProtegida>
        ),
      },
      {
        path: 'clientes/:id',
        element: (
          <RotaProtegida exige="cliente:criar">
            <TelaFichaCliente />
          </RotaProtegida>
        ),
      },
      {
        path: 'equipe',
        element: (
          <RotaProtegida exige="cliente:criar">
            <TelaEquipe />
          </RotaProtegida>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
