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
import { TelaImprimirOS } from '@/features/ordens/TelaImprimirOS'
import { TelaFichaVeiculo } from '@/features/veiculos/TelaFichaVeiculo'
import { TelaCatalogo } from '@/features/catalogo/TelaCatalogo'
import { TelaFinanceiro } from '@/features/financeiro/TelaFinanceiro'
import { TelaRevisoes } from '@/features/veiculos/TelaRevisoes'
import { TelaConfig } from '@/features/config/TelaConfig'

export const router = createBrowserRouter([
  { path: '/login', element: <TelaLogin /> },
  {
    // Fora do AppShell de propósito: a via impressa não leva menu nem barra.
    path: '/os/:id/imprimir',
    element: (
      <RotaProtegida exige="os:imprimir">
        <TelaImprimirOS />
      </RotaProtegida>
    ),
  },
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
      { path: 'veiculos/:id', element: <TelaFichaVeiculo /> },
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
      {
        path: 'catalogo',
        element: (
          <RotaProtegida exige="catalogo:editar">
            <TelaCatalogo />
          </RotaProtegida>
        ),
      },
      {
        path: 'financeiro',
        element: (
          <RotaProtegida exige="financeiro:ver">
            <TelaFinanceiro />
          </RotaProtegida>
        ),
      },
      {
        path: 'revisoes',
        element: (
          <RotaProtegida exige="cliente:criar">
            <TelaRevisoes />
          </RotaProtegida>
        ),
      },
      {
        path: 'config',
        element: (
          <RotaProtegida exige="config:editar">
            <TelaConfig />
          </RotaProtegida>
        ),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
