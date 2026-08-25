import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { mascaraPlaca, placaValida } from '@/utils/placa'
import { IconeBusca } from '@/components/layout/Icones'

/**
 * O atalho mais usado do sistema: digitou a placa, achou o carro.
 * Fica no topo da home por isso — e não escondido atrás de um menu.
 */
export function BuscaPlaca({ aoBuscar }: { aoBuscar?: (placa: string) => void }) {
  const [placa, setPlaca] = useState('')
  const navegar = useNavigate()

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!placaValida(placa)) return
    if (aoBuscar) aoBuscar(placa)
    else navegar(`/os?placa=${placa}`)
  }

  const valida = placaValida(placa)

  return (
    <form onSubmit={enviar} className="relative">
      <label htmlFor="busca-placa" className="sr-only">
        Buscar por placa
      </label>
      <IconeBusca className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-grafite-500" />
      <input
        id="busca-placa"
        value={placa}
        onChange={(e) => setPlaca(mascaraPlaca(e.target.value))}
        placeholder="BUSCAR PLACA"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={7}
        className="h-14 w-full rounded-xl border border-grafite-700 bg-grafite-900 pl-12 pr-24 font-mono text-xl font-bold tracking-widest text-grafite-50 placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-grafite-500 focus:border-acento-500 focus:outline-none focus:ring-1 focus:ring-acento-500"
      />
      <button
        type="submit"
        disabled={!valida}
        className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-lg bg-acento-500 px-4 font-semibold text-grafite-950 transition-opacity disabled:opacity-30"
      >
        Buscar
      </button>
    </form>
  )
}
